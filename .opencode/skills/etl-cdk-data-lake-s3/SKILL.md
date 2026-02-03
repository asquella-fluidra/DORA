---
name: "etl-cdk-data-lake-s3"
description: "Create S3 Data Lake with 3 buckets (raw, curated, analytics) with security baseline"
---

# Purpose
Crear un Data Lake S3 con 3 buckets (raw, curated, analytics) siguiendo arquitectura medallion y baseline de seguridad obligatoria. Establece la base para ingestión y almacenamiento de datos.

# Scope

## IN SCOPE
- Crear 3 buckets S3: raw, curated, analytics
- Configurar baseline de seguridad (block public access, encryption, versioning)
- Tags obligatorios (Project, Environment)
- RemovalPolicy por stage (dev: DESTROY, prod: RETAIN)
- Outputs con nombres de buckets para referencia

## OUT OF SCOPE
- NO crear Lambdas todavía
- NO crear Glue jobs
- NO crear Athena tables o databases
- Solo buckets S3 con configuración de seguridad

# Inputs
- Proyecto con CDK inicializado (skill: etl-cdk-bootstrap)
- Context de ambiente (dev/prod) desde opencode.json o cdk.json

# Outputs
- infra/lib/constructs/data-lake-construct.ts (construct reusable)
- infra/lib/stacks/data-lake-stack.ts (stack con 3 buckets)
- 3 buckets S3 desplegados con seguridad baseline
- Outputs con nombres de buckets

# Steps

1. **Crear construct reusable DataLakeBucket**
   - Archivo: `infra/lib/constructs/data-lake-construct.ts`
   - Props interface: zone (raw/curated/analytics), environment (dev/prod)
   - L2 construct: s3.Bucket
   - Configuración:
     - BlockPublicAccess.BLOCK_ALL
     - Encryption: S3_MANAGED
     - Versioning: true
     - RemovalPolicy por stage

2. **Configurar RemovalPolicy por stage**
   ```typescript
   const isProd = this.node.tryGetContext('environment') === 'prod';
   const removalPolicy = isProd
     ? RemovalPolicy.RETAIN
     : RemovalPolicy.DESTROY;
   ```

3. **Configurar tags obligatorios**
   ```typescript
   Tags.of(bucket).add('Project', 'DORA-ETL');
   Tags.of(bucket).add('Environment', environment);
   Tags.of(bucket).add('Zone', zone); // raw/curated/analytics
   Tags.of(bucket).add('ManagedBy', 'CDK');
   ```

4. **Aplicar lifecycle rules (opcional pero recomendado)**
   - Raw: 90 días retention
   - Curated: 1 año retention
   - Analytics: 3 años retention

5. **Crear stack con 3 buckets**
   - Archivo: `infra/lib/stacks/data-lake-stack.ts`
   - Instanciar DataLakeBucket 3 veces (raw, curated, analytics)
   - Outputs con nombres de buckets:
     ```typescript
     new CfnOutput(this, 'RawBucketName', {
       value: rawBucket.bucketName,
     });
     ```

6. **Ejecutar verification**
   - `npx cdk synth`
   - Verificar que genera 3 AWS::S3::Bucket
   - Verificar BlockPublicAccess en template
   - Verificar Encryption en template
   - `npm run build`

# Verification

## Quality Gates CDK
- `npx cdk synth` → Template con 3 buckets
- `npm run build` → Compilación TS exitosa
- `npm run lint` → Sin errores (si configurado)

## Verificación de seguridad
- Cada bucket tiene BlockPublicAccess.BLOCK_ALL
- Cada bucket tiene encryption S3_MANAGED
- Cada bucket tiene versioned: true
- Cada bucket tiene tags (Project, Environment, Zone)

## CDK assertions tests
```typescript
import { Template } from 'aws-cdk-lib/assertions';

test('Data Lake has 3 buckets with security', () => {
  const template = Template.fromStack(stack);

  // 3 buckets en total
  template.resourceCountIs('AWS::S3::Bucket', 3);

  // Verificar BlockPublicAccess
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });

  // Verificar Encryption
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    },
  });
});
```

## Evidencias requeridas
- Archivos creados: data-lake-construct.ts, data-lake-stack.ts
- Output de `npx cdk synth` (recuento de buckets)
- Output de test assertions (si ejecutado)
- Expected vs actual:
  - Expected: 3 buckets con seguridad baseline
  - Actual: [confirmación de template]

# Failure Handling

## Si cdk synth falla
- Revisar errores de CDK en output
- Verificar que aws-cdk-lib está instalado
- Corregir configuración de buckets y re-ejecutar

## Si assertions tests fallan
- Verificar que cada bucket tenga BlockPublicAccess
- Verificar que cada bucket tenga Encryption
- Verificar que cada bucket tenga versioning
- Corregir y re-ejecutar tests

## Si removal policy no es correcta
- Verificar context de environment
- Ajustar lógica de RemovalPolicy
- Re-ejecutar `npx cdk synth`

# Do / Don't

## DO
- Usar L2 construct s3.Bucket (no CfnBucket)
- Aplicar BlockPublicAccess.BLOCK_ALL siempre
- Encriptación S3_MANAGED (o KMS si es requerido)
- Versioning habilitado para datos críticos
- Tags obligatorios en todos los buckets
- Lifecycle rules para retención de datos

## DON'T
- NO crear buckets sin BlockPublicAccess
- NO usar CfnBucket a menos que sea estrictamente necesario
- NO omitir tags obligatorios
- NO crear Lambdas o Glue en este paso
- NO usar RemovalPolicy.DESTROY en prod

# Governance
- Respeta docs/governance/cdk-conventions.md
- Respeta docs/governance/rules.md (security, secrets)
- Cambios pequeños; si este paso tocara >15 archivos, dividir
- No avanzar si Quality Gates fallan (synth, build, assertions)
- Evidencias obligatorias: files changed + commands output + expected vs actual
