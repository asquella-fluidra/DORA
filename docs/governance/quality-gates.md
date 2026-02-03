# Quality Gates

## 0. Principio
- **Ningún paso se considera hecho si no pasa estos gates.**
- Los gates son obligatorios antes de considerar una tarea completada.

## 1. Gates base (antes de CDK)

### build
- **Comando**: `npm run build`
- **Esperado**:
  - Exit code: 0
  - Sin errores de TypeScript
  - Dist folder generada (si aplica)

### lint
- **Comando**: `npm run lint`
- **Esperado**:
  - Exit code: 0
  - Sin warnings que bloqueen
  - Código formateado correctamente

### test
- **Comando**: `npm test`
- **Esperado**:
  - Exit code: 0
  - Todos los tests pasan
  - Cobertura mínima: 80% (cuando aplique)

## 2. Gates CDK (cuando exista infra/)

### cdk:version
- **Comando**: `npx cdk --version`
- **Esperado**:
  - Imprime versión sin error
  - Versión compatible con el proyecto (CDK v2.x)

### cdk:ls
- **Comando**: `npx cdk ls`
- **Esperado**:
  - Lista stacks esperados (ej: IngestionStack, TransformationStack, AnalyticsStack)
  - Sin errores de sintaxis

### cdk:synth
- **Comando**: `npx cdk synth`
- **Esperado**:
  - Genera template CloudFormation sin errores
  - No warnings críticos (IAM changes, resource replacements)
  - Archivo `cdk.out/` generado

### cdk:diff (antes de deploy)
- **Comando**: `npx cdk diff`
- **Esperado**:
  - Cambios razonables y esperados
  - IAM diffs mínimos y justificados
  - No destrucciones peligrosas sin ADR/confirmación
  - Resources:
    - `+` (add) para nuevos recursos
    - `~` (modify) para cambios menores
    - `-` (delete) solo si es intencional

## 3. Gates de estructura y naming (review checklist)

### Estructura de carpetas
- ✅ `infra/` para CDK stacks y constructs
- ✅ `src/` para código de dominio y aplicación
- ✅ `glue/` para scripts PySpark de AWS Glue

### S3 Data Lake (Medallion)
- ✅ Zonas definidas:
  - `raw/` (Bronze) - datos crudos de APIs
  - `curated/` (Silver) - datos limpiados y validados
  - `analytics/` (Gold) - KPIs agregados
- ✅ O naming alternativo: `bronze/`, `silver/`, `gold/`

### Naming consistente
- ✅ Stacks: `<Purpose>Stack` (ej: `IngestionStack`)
- ✅ Constructs: `<Purpose>Construct` (ej: `S3DataBucketConstruct`)
- ✅ Resources: `<Service><Purpose><Environment>` (ej: `LambdaIngestJiraDev`)
- ✅ S3 buckets: `<app>-<zone>-<env>-<region>` (ej: `dora-etl-raw-dev-eu-west-1`)

### Clean Architecture
- ✅ `domain/` - entidades, value objects (sin AWS dependencies)
- ✅ `application/` - use cases
- ✅ `infrastructure/` - adapters (S3, SQS, Lambda wrappers)

## 4. Evidencia requerida
- **Pegar outputs de comandos** o **resumir con claridad**:
  - Ejemplo: "Build ✅ (0 errores, 3 warnings no críticos)"
  - Ejemplo: "CDK synth ✅ (template generado, 1 warning de tag auto-corregido)"
- **Si algún gate falla**:
  - Documentar el error
  - Explicar la corrección
  - Mostrar output del re-check

## 5. Nota sobre implementación
- Los comandos (`npm run build`, `npm run lint`, etc.) son **objetivos**
- Si no existen aún en `package.json`, deben crearse primero
- Validar scripts antes de ejecutar gates
