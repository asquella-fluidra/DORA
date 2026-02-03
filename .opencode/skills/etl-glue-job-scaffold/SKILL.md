---
name: "etl-glue-job-scaffold"
description: "Create Glue PySpark job skeletons for raw->curated and curated->analytics transformations"
---

# Purpose
Crear skeletons de jobs AWS Glue PySpark para transformaciones raw→curated y curated→analytics bajo glue/. Establece la base para ETL con scripts parametrizados y logging.

# Scope

## IN SCOPE
- Crear estructura glue/jobs/
- Crear skeleton de job raw→curated
- Crear skeleton de job curated→analytics
- Scripts parametrizados (runDate, input/output paths)
- Logging estructurado
- Documentación de parámetros

## OUT OF SCOPE
- NO crear CDK wiring (deploy de jobs)
- NO crear IAM roles para Glue
- NO crear triggers o schedulers
- Solo scripts PySpark bajo glue/

# Inputs
- Proyecto existente
- Contratos del dominio definidos (skill: etl-domain-contracts)

# Outputs
- glue/jobs/raw-to-curated-job.py
- glue/jobs/curated-to-analytics-job.py
- glue/README.md con documentación de jobs
- Ejemplos de parámetros de ejecución

# Steps

1. **Crear estructura glue/jobs/**
   - `mkdir -p glue/jobs`

2. **Crear skeleton raw→curated**
   - Archivo: `glue/jobs/raw-to-curated-job.py`
   - Imports: awsglue, pyspark
   - Parámetros:
     - runDate (YYYY-MM-DD)
     - inputPath (S3 raw zone)
     - outputPath (S3 curated zone)
   - Logging estructurado

3. **Implementar skeleton raw→curated**
   ```python
   import sys
   from awsglue.transforms import *
   from awsglue.utils import getResolvedOptions
   from pyspark.context import SparkContext
   from awsglue.context import GlueContext
   from awsglue.job import Job

   # Parámetros
   args = getResolvedOptions(sys.argv, [
       'JOB_NAME',
       'run_date',
       'input_path',
       'output_path'
   ])

   # Spark context
   sc = SparkContext()
   glueContext = GlueContext(sc)
   spark = glueContext.spark_session
   job = Job(glueContext)
   job.init(args['JOB_NAME'], args)

   # Logging
   logger = glueContext.getLogger()
   logger.info(f"Starting raw-to-curated job for date: {args['run_date']}")

   # Leer datos raw (placeholder)
   # dynamic_frame = glueContext.create_dynamic_frame.from_options(...)

   # Transformar datos (placeholder)
   # curated_data = transform(dynamic_frame)

   # Escribir datos curated (placeholder)
   # glueContext.write_dynamic_frame.from_options(...)

   logger.info(f"Raw-to-curated job completed successfully")

   job.commit()
   ```

4. **Crear skeleton curated→analytics**
   - Archivo: `glue/jobs/curated-to-analytics-job.py`
   - Parámetros:
     - runDate (YYYY-MM-DD)
     - inputPath (S3 curated zone)
     - outputPath (S3 analytics zone)
   - Estructura similar a raw→curated

5. **Añadir logging estructurado**
   - Usar logger de GlueContext
   - Logs obligatorios:
     - Job start con runDate
     - Input/output paths
     - Número de registros procesados
     - Job completion status

6. **Documentar parámetros de ejecución**
   - Archivo: `glue/README.md`
   - Incluir ejemplos:
     ```bash
     # Ejemplo raw→curated
     aws glue start-job-run \
       --job-name raw-to-curated-job \
       --arguments='--run_date,2024-01-01,--input_path,s3://bucket/raw/,--output_path,s3://bucket/curated/'
     ```

7. **Ejecutar verification**
   - Confirmar estructura glue/ creada
   - Validar que scripts tienen parámetros correctos
   - Verificar logging estructurado

# Verification

## Quality Gates
- Estructura glue/jobs/ creada
- Scripts PySpark tienen parámetros obligatorios
- Logging estructurado presente
- Documentación de parámetros en README.md

## Verificación de scripts
- raw-to-curated-job.py:
  - Parámetros: run_date, input_path, output_path
  - Logging de start/completion
  - Placeholder de transformación

- curated-to-analytics-job.py:
  - Parámetros: run_date, input_path, output_path
  - Logging de start/completion
  - Placeholder de agregación

## Evidencias requeridas
- Archivos creados:
  - glue/jobs/raw-to-curated-job.py
  - glue/jobs/curated-to-analytics-job.py
  - glue/README.md
- Ejemplos de parámetros en README
- Expected vs actual:
  - Expected: Scripts parametrizados con logging
  - Actual: [confirmación de estructura]

# Failure Handling

## Si scripts no tienen parámetros
- Añadir getResolvedOptions con parámetros obligatorios
- Verificar nombres de parámetros (run_date, input_path, output_path)
- Revisar sintaxis Python

## Si falta logging
- Añadir logger = glueContext.getLogger()
- Log obligatorio: job start con runDate
- Log obligatorio: job completion status

## Si README no tiene ejemplos
- Documentar parámetros de cada job
- Incluir ejemplos de aws glue start-job-run
- Especificar formato de fechas (YYYY-MM-DD)

# Do / Don't

## DO
- Mantener scripts parametrizados (no hardcoded paths)
- Usar logging estructurado de Glue
- Incluir runDate en todos los logs (idempotencia)
- Seguir convención de nombres: *-job.py
- Documentar parámetros en README.md

## DON'T
- NO hardcodear paths de S3
- NO omitir logging de start/completion
- NO crear jobs sin parámetros
- NO usar Python fuera de glue/
- NO crear IAM roles o CDK wiring

# Governance
- Respeta docs/governance/rules.md (Python solo bajo glue/)
- Respeta docs/governance/clean-architecture-ddd.md (bounded context transformation)
- Cambios pequeños; si este paso tocara >15 archivos, dividir
- No avanzar si Quality Gates fallan (estructura, parámetros, logging)
- Evidencias obligatorias: files changed + commands output + expected vs actual
