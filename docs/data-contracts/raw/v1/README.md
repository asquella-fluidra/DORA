# RAW Data Contracts v1

## Overview

Este documento define el contrato mínimo para datos RAW ingeridos desde fuentes externas (Jira, GitHub, GitLab, SonarQube, Google Analytics) en la zona RAW del Data Lake.

## S3 Path Convention

Los datos RAW se almacenan siguiendo esta estructura:

```
raw/<source>/ingestion_date=YYYY-MM-DD/<entity>.json
```

### Componentes

- **source**: Identificador de la fuente (`jira`, `github`, `gitlab`, `sonarqube`, `ga`)
- **ingestion_date**: Partición por fecha de ingestión (formato ISO: YYYY-MM-DD)
 - **entity**: Tipo de entidad (`issues`, `pull-requests`, `deployments`, `projects`, etc.)

### Ejemplos

```
raw/jira/ingestion_date=2024-01-15/issues.json
raw/github/ingestion_date=2024-01-15/pull-requests.json
raw/gitlab/ingestion_date=2024-01-15/merge-requests.json
raw/sonarqube/ingestion_date=2024-01-15/hotspots.json
raw/ga/ingestion_date=2024-01-15/sessions.json
```

## RAW Envelope (Common Structure)

Todos los datos RAW deben envolverse en una estructura común que incluye metadata de ingestión:

```typescript
interface RawEnvelope<TPayload> {
  // Identificador de la fuente
  source: 'jira' | 'github' | 'gitlab' | 'sonarqube' | 'ga';

  // Fecha de ingestión (partición S3)
  ingestionDate: string; // YYYY-MM-DD

  // Timestamp de generación del envelope
  producedAt: string; // ISO 8601

  // ID único para correlacionar con upstream
  correlationId: string;

  // Payload específico de la fuente
  payload: TPayload;
}
```

### Campos del Envelope

#### source
Identificador de la fuente de datos. Valores válidos:
- `jira`: Jira API
- `github`: GitHub API
- `gitlab`: GitLab API
- `sonarqube`: SonarQube API
- `ga`: Google Analytics API

#### ingestionDate
Fecha en que se ingirió el dato en la zona RAW. Formato: `YYYY-MM-DD` (ISO 8601 date).

**Uso:** Partición S3 para optimizar queries y permitir idempotencia.

#### producedAt
Timestamp exacto de generación del envelope. Formato: ISO 8601 con timezone.

**Ejemplo:** `2024-01-15T14:30:00Z`

#### correlationId
Identificador único del dato en el sistema origen. Permite:
- Deduplicación
- Trazabilidad end-to-end
- Correlación con otros eventos

**Formato por fuente:**
- **Jira**: `jiraIssueKey` (ej: `DORA-123`)
- **GitHub**: `repoFullName#prNumber` (ej: `middlewarehq/middleware#456`)
- **GitLab**: `projectId!mergeRequestIid` (ej: `123!789`)
- **SonarQube**: `projectKey#issueId` (ej: `my-project:ABC123`)
- **GA**: `streamId#eventId` (ej: `GA-12345#evt678`)

#### payload
Datos específicos de la fuente, sin transformaciones.

## Source-Specific Payloads

### Jira

```typescript
interface JiraIssueRaw {
  key: string;           // DORA-123
  fields: {
    summary: string;
    status: { name: string };
    created: string;     // ISO 8601
    updated: string;     // ISO 8601
    resolutiondate?: string;
    priority: { name: string };
    issuetype: { name: string };
  };
}
```

### GitHub

```typescript
interface GitHubPullRequestRaw {
  id: number;
  number: number;
  node_id: string;
  title: string;
  state: string;         // open, closed, merged
  created_at: string;    // ISO 8601
  updated_at: string;    // ISO 8601
  merged_at?: string;    // ISO 8601
  user: {
    login: string;
    id: number;
  };
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  additions: number;
  deletions: number;
}
```

### GitLab

```typescript
interface GitLabMergeRequestRaw {
  id: number;
  iid: number;
  title: string;
  state: string;         // opened, closed, merged
  created_at: string;    // ISO 8601
  updated_at: string;    // ISO 8601
  merged_at?: string;    // ISO 8601
  author: {
    id: number;
    username: string;
  };
  source_branch: string;
  target_branch: string;
  project_id: number;
}
```

### SonarQube

```typescript
interface SonarQubeHotspotRaw {
  key: string;
  ruleKey: string;
  component: string;
  projectKey: string;
  severity: string;
  status: string;
  creationDate: string;  // ISO 8601
  updateDate: string;    // ISO 8601
}
```

### Google Analytics

```typescript
interface GASessionRaw {
  sessionId: string;
  userId?: string;
  channelGrouping: string;
  source: string;
  medium: string;
  timestamp: string;     // ISO 8601
  pageViews: number;
  duration: number;      // seconds
}
```

## Idempotency Rules

### Principio Base
Los datos RAW son inmutables. Una vez escritos en la zona RAW, nunca se modifican.

### Determinismo por ingestionDate

1. **Re-ingección segura**: Si se re-ingresa el mismo dato para la misma `ingestionDate`, el resultado debe ser idéntico (determinista).

2. **Deduplicación**: El `correlationId` permite detectar y descartar duplicados.

3. **Particionamiento**: Cada `ingestionDate` es independiente. Re-ingerir un día no afecta otros días.

### Reglas de Ingestión

1. **Writer (Lambda/Glue)**:
   - Genera `ingestionDate` basado en el día actual de ejecución
   - Sobrescribe el archivo si ya existe (operación idempotente)
   - Usa `correlationId` para deduplicar dentro del archivo

2. **Consumer (Glue/Analytics)**:
   - Lee particiones específicas de `ingestionDate`
   - Asume que los datos dentro de una partición son inmutables
   - No implementa lógica de merge/upsert en zona RAW

3. **Reprocesamiento**:
   - Para corregir datos históricos: re-ingresar a una nueva fecha
   - NUNCA modificar archivos existentes en RAW

## Example: Complete RAW Message

### Jira Issue

```json
{
  "source": "jira",
  "ingestionDate": "2024-01-15",
  "producedAt": "2024-01-15T10:30:00Z",
  "correlationId": "DORA-123",
  "payload": {
    "key": "DORA-123",
    "fields": {
      "summary": "Fix authentication bug",
      "status": { "name": "Done" },
      "created": "2024-01-10T09:00:00Z",
      "updated": "2024-01-15T08:00:00Z",
      "resolutiondate": "2024-01-15T08:00:00Z",
      "priority": { "name": "High" },
      "issuetype": { "name": "Bug" }
    }
  }
}
```

### GitHub Pull Request

```json
{
  "source": "github",
  "ingestionDate": "2024-01-15",
  "producedAt": "2024-01-15T14:30:00Z",
  "correlationId": "middlewarehq/middleware#456",
  "payload": {
    "id": 123456789,
    "number": 456,
    "node_id": "PR_kwDOABC123",
    "title": "Add user authentication",
    "state": "merged",
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-15T14:00:00Z",
    "merged_at": "2024-01-15T14:00:00Z",
    "user": {
      "login": "developer",
      "id": 12345
    },
    "base": {
      "ref": "main",
      "sha": "abc123..."
    },
    "head": {
      "ref": "feature/auth",
      "sha": "def456..."
    },
    "additions": 150,
    "deletions": 50
  }
}
```

## Schema Versioning

### Current Version: v1

- **Formato**: JSON
- **Compression**: None (por ahora)
- **Encoding**: UTF-8

### Cambios Incompatibles (Backward Breaking)
Si se requiere un cambio que rompe backward compatibility:
- Crear nueva versión: `v2/`
- Mantener `v1/` durante un periodo de transición
- Documentar migración en `docs/data-contracts/raw/v2/README.md`

### Cambios Compatibles (Backward Compatible)
Si se añaden campos opcionales:
- Mantener `v1/`
- Actualizar esta documentación
- Añadir campo como `optional` en TypeScript interfaces

## Validation Rules

### Mandatory Fields (Envelope)
- ✅ `source`: Debe coincidir con lista permitida
- ✅ `ingestionDate`: Formato YYYY-MM-DD válido
- ✅ `producedAt`: ISO 8601 válido
- ✅ `correlationId`: No vacío, único por fuente
- ✅ `payload`: No null, estructura según fuente

### Mandatory Fields (Payload)
Varía por fuente. Ver interfaces TypeScript en `src/domain/raw/v1/`.

### Validación en Ingestión
- Validar schema antes de escribir a S3
- Rechazar mensajes que no cumplen el contrato
- Loggear warnings para campos opcionales faltantes

## Related Documentation

- [Clean Architecture + DDD](../governance/clean-architecture-ddd.md)
- [Quality Gates](../governance/quality-gates.md)
- [Domain Contracts](domain/contracts/)

## Version History

- **v1** (2024-01-15): Versión inicial con envelope común y 5 fuentes soportadas
