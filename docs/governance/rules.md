# Rules (Project Operating System)

## 1. Objetivo
- ETL + ROI dashboard para ingeniería
- KPIs ejecutivos de velocidad (Deployment Frequency, Lead Time, MTTR, Change Failure Rate)
- Arquitectura serverless sobre AWS Data Lake (S3 + Lambda + Glue)
- Integración con Jira, GitHub, GitLab, SonarQube, Google Analytics
- Data lakes medallion: Raw (Bronze) → Curated (Silver) → Analytics (Gold)
- Clean Architecture + DDD para mantenibilidad y testabilidad

## 2. Regla de lenguajes (NO negociable)
- **Infra/CDK + Lambdas**: TypeScript
- **AWS Glue (PySpark)**: Python
- **No mezclar Python fuera de glue/**
  - Scripts de orquestación: TypeScript/Node.js
  - Lógica de negocio en dominio: TypeScript (si no es Glue)

## 3. Regla de ejecución (Step-by-step)
- **Un prompt = una unidad de trabajo pequeña**
  - Ejemplo: "crear el construct de S3 bucket para raw zone"
  - NO: "crear todo el stack de ingestión"
- **No avanzar sin pasar los Quality Gates**
  - Cada paso debe validar build → lint → test → cdk checks
  - Si un gate falla: corregir antes de continuar
- **Si falla un gate**:
  1. Leer el error
  2. Arreglar el código
  3. Re-ejecutar el gate
  4. Solo continuar si pasa

## 4. Límite de cambios (anti-bola de nieve)
- **Si un cambio toca >15 archivos**:
  - Detenerse inmediatamente
  - Proponer división en 2–3 micro-prompts
  - Cada micro-prompt debe ser <15 archivos
- **Ejemplo de división**:
  - Prompt 1: "Crear construct S3 Bucket para raw zone"
  - Prompt 2: "Crear construct Lambda Function para ingestión"
  - Prompt 3: "Crear IngestionStack que orquesta bucket + lambda"

## 5. Evidencias obligatorias al final de cada paso
- **Lista de archivos tocados** (creados/modificados)
- **Comandos ejecutados + output**
  - Ejemplo: `npm run build` → "✅ Build exitoso"
- **Resultado esperado vs real**
  - Esperado: "CDK synth genera template"
  - Real: "Template generado en cdk.out/"
- **Si hubo fallo**:
  - Corrección aplicada
  - Output del re-check (comando que valida la corrección)

## 6. Seguridad
- **Secrets**: AWS Secrets Manager / SSM Parameter Store
  - NUNCA en el repo
  - NUNCA en logs
- **No tokens en logs**
  - Redactar en outputs: `***REDACTED***`
- **IAM mínimo privilegio** como estándar
  - Policies específicas por recurso
  - Evitar comodines `*` salvo casos documentados
- **Datos sensibles**:
  - Encriptación en reposo (S3, RDS)
  - Encriptación en tránsito (TLS obligatorio)

## 7. Definición de "Done" por iteración
- **Ver [Quality Gates](./quality-gates.md)** para criterios completos
- Resumen:
  - Build: ✅
  - Lint: ✅
  - Test: ✅
  - CDK checks: ✅ (si aplica)
  - Evidencias documentadas: ✅
