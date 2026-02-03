# AWS CDK Conventions (TypeScript, CDK v2)

## 1. L2 Constructs First
- **Preferir L2 constructs**:
  - `s3.Bucket`, `lambda.Function`, `events.Rule`, `sqs.Queue`, etc.
  - Mayor nivel de abstracción, mejor DX
- **Usar L1 (Cfn*) solo si**:
  - Falta una propiedad crítica no expuesta en L2
  - Se necesita control fino de CloudFormation
  - Documentar el por qué en comentario

```typescript
// ✅ L2 Construct
const bucket = new s3.Bucket(this, 'DataBucket', {
  bucketName: 'my-bucket',
});

// ❌ Evitar L1 a menos que sea necesario
const bucket = new s3.CfnBucket(this, 'DataBucket', {
  bucketName: 'my-bucket',
});
```

## 2. Modularidad
- **Stacks pequeños**:
  - Separar por bounded context: `IngestionStack`, `TransformationStack`, `AnalyticsStack`
  - Stack size razonable (<500 recursos)
- **Constructs personalizados**:
  - Crear en `infra/lib/constructs/`
  - Cada construct con props interface clara
  - Reutilizable entre stacks

```typescript
// infra/lib/constructs/s3-data-bucket.ts
export interface S3DataBucketProps {
  zone: 'raw' | 'curated' | 'analytics';
  environment: 'dev' | 'prod';
}

export class S3DataBucket extends Construct {
  constructor(scope: Construct, id: string, props: S3DataBucketProps) {
    super(scope, id);
    // Implementation
  }
}
```

## 3. Stage & Context

### Stage por context
- Usar context para definir environment:
  ```bash
  cdk deploy -c environment=dev
  cdk deploy -c environment=prod
  ```

### RemovalPolicy
- **dev**: `RemovalPolicy.DESTROY` (solo si está explícitamente permitido)
- **prod**: `RemovalPolicy.RETAIN` (nunca destruir datos)
- **Predeterminado**: `RETAIN` para buckets con datos

```typescript
const isProd = this.node.tryGetContext('environment') === 'prod';

new s3.Bucket(this, 'DataBucket', {
  removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
});
```

### Tags obligatorios
- `Project`: DORA-ETL
- `Environment`: dev | prod
- `Owner`: equipo responsable (si aplica)
- `CostCenter`: centro de costos (si aplica)

```typescript
Tags.of(this).add('Project', 'DORA-ETL');
Tags.of(this).add('Environment', environment);
Tags.of(this).add('ManagedBy', 'CDK');
```

## 4. S3 Data Lake (Medallion)

### Zonas
- **Bronze/Raw**: Datos crudos de APIs (sin transformar)
- **Silver/Curated**: Limpiados, validados, tipados
- **Gold/Analytics**: KPIs agregados para dashboards

### Seguridad (obligatoria)
- `BlockPublicAccess.BLOCK_ALL` - sin excepciones
- `encryption: s3.BucketEncryption.S3_MANAGED`
- `versioned: true` - para datos críticos

```typescript
new s3.Bucket(this, 'RawBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
});
```

### Prefix recomendado
```
raw/
├── jira/
│   └── ingestion_date=YYYY-MM-DD/
│       └── jira_issues.json
├── github/
│   └── ingestion_date=YYYY-MM-DD/
│       └── pull_requests.json
└── gitlab/
    └── ingestion_date=YYYY-MM-DD/
        └── merge_requests.json
```

## 5. Lambdas (ingestion)

### Configuración estándar
- **Runtime**: NodeJS 18.x (o superior)
- **Memory**: 256 MB (default), ajustar si es necesario
- **Timeout**: 5 min (max para Lambda)
- **Logging**: JSON estructurado

```typescript
new lambda.Function(this, 'IngestJiraFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  memorySize: 256,
  timeout: Duration.minutes(5),
  environment: {
    LOG_LEVEL: 'INFO',
  },
});
```

### Logging (JSON)
```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  logLevel: 'INFO',
  serviceName: 'jira-ingestion',
});

export const handler = async (event) => {
  logger.info('Ingestion started', {
    source: 'jira',
    ingestionDate: new Date().toISOString(),
  });
};
```

### CorrelationId
- Incluir en todos los logs para traza
- Pasar entre Lambdas via EventBridge/SQS

### Idempotencia
- Por `ingestion_date` (YYYY-MM-DD)
- Evitar duplicados en S3: verificar si key existe antes de escribir

### DLQ (Dead Letter Queue)
- Obligatorio para Lambdas de ingestión
- Usar SQS FIFO para orden garantizado
- Monitorear errores en DLQ

```typescript
const dlq = new sqs.Queue(this, 'IngestDLQ', {
  queueName: 'ingest-dlq.fifo',
  fifo: true,
});

new lambda.Function(this, 'IngestFunction', {
  deadLetterQueue: dlq,
});
```

## 6. IAM

### Principio mínimo privilegio
- Solo permisos necesarios
- Especificar recursos ARN cuando sea posible
- Evitar `Resource: '*'`

### Policies inline preferidas
```typescript
const role = new iam.Role(this, 'LambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  inlinePolicies: {
    S3ReadAccess: new iam.PolicyDocument({
      policyStatements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket'],
          resources: [
            rawBucket.bucketArn,
            `${rawBucket.bucketArn}/*`,
          ],
        }),
      ],
    }),
  },
});
```

### Evitar comodines
- ❌ `Resource: '*'` (salvo casos excepcionales documentados)
- ✅ `Resource: bucketArn` o `Resource: 'arn:aws:s3:::my-bucket/*'`

## 7. Testing CDK

### Usar @aws-cdk/assertions
```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { expect, haveResource } from '@aws-cdk/assertions';

test('S3 Bucket has block public access', () => {
  const stack = new MyStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
});
```

### Tests obligatorios para
- ✅ Buckets creados con seguridad (BlockPublicAccess, encryption)
- ✅ Lambdas con DLQ configurada
- ✅ IAM policies con mínimo privilegio
- ✅ Tags aplicados correctamente

### Ejemplo completo
```typescript
test('IngestionStack creates raw bucket with encryption', () => {
  const stack = new IngestionStack(app, 'TestStack', {
    environment: 'dev',
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: [
      {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    ],
  });
});
```
