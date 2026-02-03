---
name: "etl-domain-contracts"
description: "Define domain contracts and correlation IDs for DORA KPIs using Clean Architecture"
---

# Purpose
Definir contratos del dominio (interfaces/types) y correlation IDs para KPIs de DORA usando Clean Architecture. Establece las bases para entidades, value objects y reglas de negocio sin dependencias de AWS.

# Scope

## IN SCOPE
- Definir interfaces/types para entidades del dominio
- Definir value objects (DateRange, DORAMetrics, etc.)
- Definir correlation IDs (jiraIssueKey, repoFullName, prNumber, etc.)
- Crear unit tests para validar contratos
- Documentar contratos en docs/data-contracts/

## OUT OF SCOPE
- NO usar AWS SDK ni dependencias de infraestructura
- NO crear CDK constructs
- NO crear Glue jobs
- Dominio puro sin dependencias externas

# Inputs
- Proyecto con toolchain TypeScript (skill: etl-repo-toolchain)
- Documentación de DORA metrics (Deployment Frequency, Lead Time, MTTR, CFR)

# Outputs
- src/domain/entities/ (entidades del dominio)
- src/domain/value-objects/ (value objects)
- src/domain/contracts/ (interfaces/types)
- docs/data-contracts/v1/ (documentación de contratos)
- Unit tests para contratos

# Steps

1. **Crear estructura src/domain/**
   - `mkdir -p src/domain/entities`
   - `mkdir -p src/domain/value-objects`
   - `mkdir -p src/domain/contracts`
   - `mkdir -p tests/domain`

2. **Definir entidades del dominio**
   - `PullRequest`: id, number, repoFullName, state, createdAt, mergedAt
   - `Deployment`: id, teamId, environment, deployedAt, pullRequestId
   - `Incident`: id, title, severity, createdAt, resolvedAt

3. **Definir value objects**
   - `DateRange`: startDate, endDate, validation
   - `DORAMetrics`: deploymentFrequency, leadTime, mttr, changeFailureRate
   - `DORAScore`: ELITE, HIGH, MEDIUM, LOW

4. **Definir correlation IDs (OBLIGATORIO)**
   - jiraIssueKey: string (ej: "DORA-123")
   - repoFullName: string (ej: "middlewarehq/middleware")
   - prNumber: number (ej: 123)
   - mergeRequestIid: number (ej: 456)
   - pipelineId: string (ej: "github-actions-pipeline-1")
   - deploymentId: string (ej: "deploy-prod-20240101")
   - testExecutionId: string (ej: "test-run-abc123")

5. **Crear contratos versionados**
   - Archivo: `src/domain/contracts/v1/pull-request.ts`
   ```typescript
   export interface PullRequestV1 {
     id: string;
     number: number;
     repoFullName: string; // correlation ID
     state: 'open' | 'closed' | 'merged';
     createdAt: string; // ISO 8601
     mergedAt?: string; // ISO 8601
     additions: number;
     deletions: number;
   }
   ```

6. **Documentar contratos en docs/data-contracts/v1/**
   - Crear README.md con descripción de cada contrato
   - Incluir ejemplos de JSON
   - Especificar correlation IDs obligatorios

7. **Crear unit tests para contratos**
   - Tests para validación de DateRange
   - Tests para cálculo de DORAMetrics
   - Tests para serialización de entidades

8. **Ejecutar verification**
   - `npm run build`
   - `npm test`

# Verification

## Quality Gates
- `npm run build` → Compilación TS exitosa
- `npm test` → Tests de contratos pasan
- `npm run lint` → Sin errores de linting (si configurado)

## Verificación de contratos
- Todas las entidades tienen correlation IDs
- Value objects tienen validaciones
- Contratos están versionados (v1/)
- Documentación en docs/data-contracts/v1/

## Evidencias requeridas
- Archivos creados:
  - src/domain/entities/*
  - src/domain/value-objects/*
  - src/domain/contracts/v1/*
  - docs/data-contracts/v1/*
  - tests/domain/*
- Output de `npm run build`
- Output de `npm test`
- Expected vs actual:
  - Expected: Contratos con correlation IDs
  - Actual: [confirmación de contratos creados]

# Failure Handling

## Si build falla (errores de TS)
- Revisar errores de tipos en output
- Verificar que todas las interfaces/types están exportadas
- Corregir y re-ejecutar `npm run build`

## Si tests fallan
- Verificar que tests validan correctamente los contratos
- Revisar mocks de entidades
- Corregir tests o contratos y re-ejecutar `npm test`

## Si faltan correlation IDs
- Revisar cada contrato para incluir IDs obligatorios
- Añadir IDs faltantes (jiraIssueKey, repoFullName, etc.)
- Re-ejecutar tests

# Do / Don't

## DO
- Usar Clean Architecture (dominio sin dependencias AWS)
- Versionar contratos (v1, v2, ...)
- Incluir correlation IDs en todos los contratos
- Crear unit tests para validar contratos
- Documentar contratos en docs/data-contracts/

## DON'T
- NO usar AWS SDK ni dependencias de infraestructura
- NO crear CDK constructs en este paso
- NO crear Glue jobs
- NO omitir correlation IDs
- NO mezclar dominio con infraestructura

# Governance
- Respeta docs/governance/clean-architecture-ddd.md
- Respeta docs/governance/rules.md (lenguajes, arquitectura)
- Cambios pequeños; si este paso tocara >15 archivos, dividir
- No avanzar si Quality Gates fallan (build, test)
- Evidencias obligatorias: files changed + commands output + expected vs actual
