---
name: "etl-cdk-bootstrap"
description: "Initialize AWS CDK v2 app in TypeScript with empty stack and working synth"
---

# Purpose
Inicializar una aplicación CDK v2 en TypeScript con una stack vacía que compila y ejecuta `cdk synth` correctamente. Establece la base para definir infraestructura.

# Scope

## IN SCOPE
- Instalar dependencias CDK v2 (aws-cdk-lib, constructs)
- Crear estructura infra/bin y infra/lib
- Configurar cdk.json
- Crear stack vacía que synth correctamente
- Scripts en package.json para comandos CDK

## OUT OF SCOPE
- NO crear recursos AWS todavía (solo stack vacía)
- NO crear buckets, lambdas, o roles
- NO configurar contexto de ambientes (dev/prod) todavía

# Inputs
- Proyecto con toolchain TypeScript instalada (skill: etl-repo-toolchain)

# Outputs
- infra/bin/app.ts (entry point CDK)
- infra/lib/stack.ts (stack vacía)
- cdk.json configurado
- package.json actualizado con dependencias CDK y scripts
- `npx cdk synth` genera template CloudFormation

# Steps

1. **Instalar dependencias CDK v2**
   - `npm install --save-dev aws-cdk-lib`
   - `npm install --save-dev constructs`
   - `npm install --save-dev ts-node`
   - `npm install --save-dev @types/aws-lambda` (para Lambdas futuras)

2. **Crear estructura de directorios infra/**
   - `mkdir -p infra/bin`
   - `mkdir -p infra/lib`

3. **Crear entry point (infra/bin/app.ts)**
   ```typescript
   #!/usr/bin/env node
   import 'source-map-support/register';
   import * as cdk from 'aws-cdk-lib';
   import { MyStack } from '../lib/stack';

   const app = new cdk.App();
   new MyStack(app, 'MyStack', {
     env: {
       account: process.env.CDK_DEFAULT_ACCOUNT,
       region: process.env.CDK_DEFAULT_REGION,
     },
   });
   ```

4. **Crear stack vacía (infra/lib/stack.ts)**
   ```typescript
   import * as cdk from 'aws-cdk-lib';
   import { Construct } from 'constructs';

   export class MyStack extends cdk.Stack {
     constructor(scope: Construct, id: string, props?: cdk.StackProps) {
       super(scope, id, props);

       // Stack vacía - placeholder para futuros recursos
     }
   }
   ```

5. **Configurar cdk.json**
   ```json
   {
     "app": "npx ts-node --prefer-ts-exts infra/bin/app.ts",
     "watch": {
       "include": [
         "**"
       ],
       "exclude": [
         "README.md",
         "cdk*.json",
         "**/*.d.ts",
         "**/*.js",
         "tsconfig.json",
         "package*.json",
         "yarn.lock",
         "node_modules",
         "test"
       ]
     },
     "context": {
       "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
       "@aws-cdk/core:checkSecretUsage": true,
       "@aws-cdk/core:target-partitions": [
         "aws",
         "aws-cn"
       ],
       "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
       "@aws-cdk/aws-ec2:uniqueImdsv2TemplateName": true,
       "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true,
       "@aws-cdk/aws-iam:minimizePolicies": true,
       "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
       "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
       "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
       "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
       "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
       "@aws-cdk/core:enablePartitionLiterals": true,
       "@aws-cdk/aws-events:eventsTargetQueueSameAccount": true,
       "@aws-cdk/aws-iam:standardizedServicePrincipals": true,
       "@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker": true,
       "@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName": true,
       "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
       "@aws-cdk/aws-route53-pri:useRoute53ResolverHostedZoneAttr": true,
       "@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion": true
     }
   }
   ```

6. **Actualizar package.json con scripts CDK**
   ```json
   {
     "scripts": {
       "build": "tsc",
       "watch": "tsc -w",
       "cdk": "cdk",
       "cdk:synth": "cdk synth",
       "cdk:diff": "cdk diff",
       "cdk:deploy": "cdk deploy",
       "cdk:destroy": "cdk destroy"
     }
   }
   ```

7. **Ejecutar verification CDK**
   - `npx cdk --version`
   - `npx cdk ls`
   - `npx cdk synth`

# Verification

## Quality Gates CDK
- `npx cdk --version` → Imprime versión (ej: 2.x.x)
- `npx cdk ls` → Lista stack (MyStack)
- `npx cdk synth` → Genera template CloudFormation en cdk.out/
- `npm run build` → Compila TypeScript sin errores

## Verificación de template generado
- Archivo `cdk.out/MyStack.template.json` existe
- Contiene `AWSTemplateFormatVersion`
- NO contiene recursos todavía (stack vacía)

## Evidencias requeridas
- Archivos creados: infra/bin/app.ts, infra/lib/stack.ts, cdk.json
- package.json modificado (dependencias + scripts)
- Output de `npx cdk --version`
- Output de `npx cdk ls`
- Output de `npx cdk synth`
- Confirmación: template CloudFormation generado

# Failure Handling

## Si cdk synth falla
- Revisar errores de compilación TypeScript
- Verificar que infra/bin/app.ts es ejecutable
- Verificar que aws-cdk-lib está instalado
- Corregir y re-ejecutar `npx cdk synth`

## Si cdk ls falla
- Verificar configuración cdk.json
- Asegurar que app.ts exporta correctamente el stack
- Re-ejecutar `npx cdk ls`

## Si build falla (TypeScript)
- Revisar errores en output
- Corregir errores de tipos en infra/bin/app.ts o infra/lib/stack.ts
- Re-ejecutar `npm run build`

# Do / Don't

## DO
- Seguir convenciones de CDK v2 (no usar @aws-cdk/* packages)
- Usar constructs lib para componentes reutilizables
- Versionar cdk.json con configuraciones de contexto
- Mantener stack vacía inicial (sin recursos)

## DON'T
- NO crear recursos AWS todavía (buckets, lambdas, etc.)
- NO instalar dependencias legacy de CDK v1
- NO configurar ambientes (dev/prod) todavía
- NO añadir constructs personalizados todavía

# Governance
- Respeta docs/governance/cdk-conventions.md
- Cambios pequeños; si este paso tocara >15 archivos, dividir
- No avanzar si Quality Gates fallan (cdk synth, ls, version)
- Evidencias obligatorias: files changed + commands output + expected vs actual
