# Clean Architecture + DDD (Project Guidelines)

## 1. Bounded Contexts (mínimos)

### ingestion
- **Responsabilidad**: Fuentes externas → Raw Zone
- **Fuentes**: Jira, GitHub, GitLab, SonarQube, Google Analytics
- **Salida**: Datos crudos en S3 (raw/bronze)

### transformation
- **Responsabilidad**: Raw → Curated
- **Proceso**: Limpieza, validación, tipado, enriquecimiento
- **Salida**: Datos curados en S3 (curated/silver)

### analytics
- **Responsabilidad**: Curated → KPIs
- **Proceso**: Agregación, cálculo de métricas DORA
- **Salida**: KPIs en S3 (analytics/gold)

### domain
- **Responsabilidad**: Reglas de negocio de KPIs y contratos
- **Contenido**: Definiciones de Deployment, Lead Time, MTTR, CFR
- **Independencia**: Sin dependencias de AWS

## 2. Capas (Clean Architecture)

### Domain (Capa núcleo)
- **Contenido**:
  - Entidades (Deployment, PullRequest, Incident)
  - Value Objects (DateRange, DORAMetrics)
  - Reglas de negocio puras
- **Regla**: NO depende de AWS ni SDKs
- **Ubicación**: `src/domain/`

```typescript
// src/domain/entities/Deployment.ts
export class Deployment {
  constructor(
    private readonly id: string,
    private readonly teamId: string,
    private readonly deployedAt: Date,
  ) {}

  calculateAge(): number {
    return Date.now() - this.deployedAt.getTime();
  }
}
```

### Application (Casos de uso)
- **Contenido**:
  - Use Cases (FetchPullRequests, CalculateDORAMetrics)
  - Orquestación de lógica de negocio
- **Regla**: Depende SOLO de Domain
- **Ubicación**: `src/application/`

```typescript
// src/application/use-cases/CalculateDORAMetrics.ts
export class CalculateDORAMetrics {
  constructor(
    private readonly deploymentRepo: IDeploymentRepository,
    private readonly incidentRepo: IIncidentRepository,
  ) {}

  execute(teamId: string, dateRange: DateRange): DORAMetrics {
    const deployments = this.deploymentRepo.findByTeam(teamId, dateRange);
    const incidents = this.incidentRepo.findByTeam(teamId, dateRange);

    return DORAMetrics.calculate(deployments, incidents);
  }
}
```

### Adapters (Interfaces externas)
- **Contenido**:
  - Clientes de APIs externas (JiraAPI, GitHubAPI)
  - Implementaciones de repositorios (S3Repository, AthenaRepository)
- **Regla**: Implementan ports definidos en Domain/Application
- **Ubicación**: `src/infrastructure/adapters/`

```typescript
// src/infrastructure/adapters/S3DeploymentRepository.ts
export class S3DeploymentRepository implements IDeploymentRepository {
  constructor(private readonly s3Client: S3Client) {}

  async findByTeam(teamId: string, range: DateRange): Promise<Deployment[]> {
    // Lee de S3 y retorna entidades del dominio
  }
}
```

### Infrastructure (AWS-specific)
- **Contenido**:
  - CDK Stacks y Constructs
  - Lambdas (handlers)
  - Glue Jobs (scripts PySpark)
  - AWS SDK wrappers
- **Regla**: Cablea (wiring) y despliega
- **Ubicación**: `infra/` (CDK), `glue/` (PySpark)

```typescript
// infra/stacks/IngestionStack.ts
export class IngestionStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, 'RawBucket', {...});

    const lambda = new lambda.Function(this, 'IngestLambda', {
      handler: 'index.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });
  }
}
```

## 3. Dependencias (regla)

### Regla general
- **Domain**: NO depende de nadie (excepto librerías puras)
- **Application**: depende SOLO de Domain
- **Adapters**: implementan ports de Domain/Application
- **Infrastructure**: cablea todo y despliega en AWS

### Diagrama de dependencias
```
┌─────────────────────────────────────────┐
│  Infrastructure (CDK, Lambda, Glue)     │  ← Outer layer
├─────────────────────────────────────────┤
│  Adapters (S3, SQS, APIs)               │
├─────────────────────────────────────────┤
│  Application (Use Cases)                │
├─────────────────────────────────────────┤
│  Domain (Entities, Value Objects)       │  ← Inner layer
└─────────────────────────────────────────┘
```

### Ejemplo práctico
```typescript
// ❌ MAL: Domain depende de AWS SDK
import { S3Client } from '@aws-sdk/client-s3';

export class Deployment {
  async saveToS3(): Promise<void> {
    // Violación: Domain conoce infraestructura
  }
}

// ✅ BIEN: Domain es agnóstico
export class Deployment {
  calculateAge(): number {
    // Lógica pura, sin dependencias externas
  }
}
```

## 4. Data Contracts (versionado)

### Estructura
- `docs/data-contracts/v1/...`
- Un archivo por entidad/contrato
- JSON Schema o TypeScript interfaces

### Cambios incompatibles
- **Si rompe backward compatibility**: Nueva versión
  - `v1/pull-request.json` → `v2/pull-request.json`
- **Cambios backwards-compatible**: Mantener versión
  - Agregar campo opcional: OK en v1

### Correlation IDs (obligatorios)
Incluir en todos los eventos/contratos:
- `jiraIssueKey` - para Jira
- `repoFullName` - para GitHub/GitLab
- `prNumber` / `mergeRequestIid` - para PRs/MRs
- `pipelineId` - para CI/CD
- `deploymentId` - para deployments
- `testExecutionId` - para tests

### Ejemplo de contrato
```typescript
// docs/data-contracts/v1/pull-request.ts
export interface PullRequestV1 {
  id: string;
  number: number;
  repoFullName: string;  // correlation ID
  state: 'open' | 'closed' | 'merged';
  createdAt: string;     // ISO 8601
  mergedAt?: string;     // ISO 8601
  author: string;
  additions: number;
  deletions: number;
}
```

## 5. Testing strategy (mínimo)

### Domain (unit tests)
- **Qué testear**:
  - Reglas de negocio (cálculo de KPIs)
  - Value Objects (validaciones)
  - Agregates (comportamiento interno)
- **Herramientas**: Jest, Mocha
- **Aislamiento**: Sin dependencias externas

```typescript
describe('DORAMetrics', () => {
  it('should calculate elite score', () => {
    const metrics = DORAMetrics.calculate(deployments, incidents);
    expect(metrics.score).toBe(DORAScore.ELITE);
  });
});
```

### CDK (assertions tests)
- **Qué testear**:
  - Buckets creados con seguridad
  - Lambdas con DLQ
  - IAM policies mínimo privilegio
- **Herramientas**: @aws-cdk/assertions

```typescript
test('Raw bucket has block public access', () => {
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
    },
  });
});
```

### Glue (tests mínimos)
- **Qué testear**:
  - Scripts PySpark validan schema
  - Transformaciones clave
- **Herramientas**: pytest, local testing
- **Validación**: Logs y outputs de jobs

### Integration smoke tests
- **Cuándo**: Fases posteriores (post-MVP)
- **Qué testear**:
  - Flujo end-to-end: ingestión → transformación → KPIs
  - Integración con APIs reales (staging environment)
- **Herramientas**: LocalStack, AWS CDK integrations

## 6. Mapeo DDD → AWS

| Concepto DDD | AWS Service | Ejemplo |
|--------------|-------------|---------|
| Bounded Context | CDK Stack | `IngestionStack`, `AnalyticsStack` |
| Aggregate | S3 Prefix/DynamoDB Table | `raw/github/pr/` |
| Repository | S3, Athena, RDS | `S3PullRequestRepository` |
| Event Store | EventBridge, Kinesis | `PRMergedEvent` |
| Read Model | Athena, Redshift, QuickSight | `AnalyticsView` |
| Integration Event | SNS, SQS | `DeploymentCompleted` → trigger calculation |
| Policy | Lambda Function | `CalculateDORAMetricsOnDeployment` |

## 7. Anti-patrones a evitar

### ❌ Anemic Domain Model
```typescript
// MAL: Solo datos, sin comportamiento
class PullRequest {
  state: string;
  mergedAt: Date;
}

// Lógica fuera de la entidad
if (pr.state === 'open') pr.state = 'merged';
```

### ✅ Rich Domain Model
```typescript
// BIEN: Comportamiento encapsulado
class PullRequest {
  private state: PRState;

  merge(): void {
    if (!this.canMerge()) throw new Error('Cannot merge');
    this.state = PRState.MERGED;
  }
}
```

### ❌ Infraestructura en Domain
```typescript
// MAL: Domain conoce S3
class Deployment {
  async saveToS3(): Promise<void> {...}
}
```

### ✅ Repository Pattern
```typescript
// BIEN: Repository es adapter
interface IDeploymentRepository {
  save(deployment: Deployment): Promise<void>;
}

class S3DeploymentRepository implements IDeploymentRepository {
  async save(deployment: Deployment): Promise<void> {
    await this.s3Client.putObject({...});
  }
}
```
