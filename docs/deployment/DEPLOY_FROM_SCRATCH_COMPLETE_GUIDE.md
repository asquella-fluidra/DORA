# Guía de Despliegue Completo desde Cero

## ID: DEPLOY_FROM_SCRATCH_V1

## Resumen

Sí, **tenemos TODO el código completo** para desplegar el proyecto en AWS Athena desde cero. Puedes eliminar todos los recursos en AWS y recrearlos sin problemas usando comandos.

## 📦 Componentes del Proyecto

### 1. Infraestructura (AWS CDK - TypeScript)
**Ubicación**: `infra/`

**Stacks**:
- `IngestionStack` - Ingestión de datos de prueba
- `AnalyticsStack` - Procesamiento ETL con Glue y Athena

**Recursos creados**:

#### IngestionStack
- ✅ S3 Bucket RAW: `dora-etl-raw-dev-{region}`
- ✅ Lambda Function: `ingestion-fake-dev`
  - Runtime: Node.js 18.x
  - Handler: `src/handlers/ingest-fake-data-handler.ts`
  - Timeout: 5 min
  - Memory: 256 MB
- ✅ DLQ SQS: `ingest-dlq-dev`
- ✅ EventBridge Schedule: Diario a las 02:00 UTC
- ✅ CloudWatch Logs

#### AnalyticsStack
- ✅ S3 Bucket CURATED: `dora-etl-curated-dev-{region}`
- ✅ Glue Database: `dora_etl_dev`
- ✅ Glue Job: `curate-jira-issues-dev`
  - Script: `glue/jobs/curate_jira_issues/job-minimal.py`
  - Transforma: RAW (JSON) → CURATED (Parquet)
- ✅ Glue Crawler: `curated-jira-issues-dev`
  - Crea tabla: `curated_jira_issues`
- ✅ Glue Job: `build-dora-kpis-dev`
  - Script: `glue/jobs/build_dora_kpis/job.py`
  - Transforma: CURATED → ANALYTICS (KPIs)
- ✅ Glue Crawler: `analytics-dora-kpis-dev`
  - Crea tabla: `analytics_dora_kpis`
- ✅ Athena WorkGroup: `dora-etl-dev`
- ✅ IAM Roles: GlueJobRole, CrawlerRole

### 2. Scripts ETL (Glue PySpark - Python)
**Ubicación**: `glue/jobs/`

#### curate-jira-issues/job-minimal.py
- **Entrada**: JSON desde S3 RAW
- **Salida**: Parquet en S3 CURATED
- **Proceso**:
  - Lee JSON envelope con estructura: `{ source, resource, ingestionDate, producedAt, correlationId, payload }`
  - Extrae y transforma campos de issues de Jira
  - Escribe en formato Parquet particionado por `ingestion_date`

#### build_dora_kpis/job.py
- **Entrada**: Parquet desde S3 CURATED
- **Salida**: KPIs en S3 ANALYTICS
- **Proceso**:
  - Lee `curated_jira_issues`
  - Calcula métricas DORA:
    - tickets_total
    - tickets_done
    - tickets_in_progress
    - tickets_todo
    - wip (Work in Progress)
    - avg_cycle_time_hours
  - Escribe 1 fila de KPIs por día

### 3. Datos de Prueba
**Ubicación**: `data/fakes/`

#### jira/issues.json
- 3 tickets de ejemplo:
  - DORA-101: Done (Bug, High priority)
  - DORA-102: In Progress (Story, Medium priority)
  - DORA-103: To Do (Task, Low priority)

#### github/pull-requests.json
- 3 pull requests de ejemplo

### 4. Handler de Ingestión (Lambda - TypeScript)
**Ubicación**: `src/handlers/ingest-fake-data-handler.ts`

**Funciones**:
- `handler(event)` - Entry point
- `getFakeJsonData(source, resource)` - Retorna datos de prueba
- `createRawEnvelope()` - Envolvente de datos
- `envelopeToS3Key()` - Genera key en S3

**Origen de datos**:
- Jira issues (hardcoded)
- GitHub pull requests (hardcoded)

### 5. Vistas de Athena (SQL)
**Ubicación**: `/tmp/` (creado durante sesión)

#### v_jira_status_snapshot
```sql
SELECT
  ingestion_date,
  SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS tickets_done,
  SUM(CASE WHEN status IN ('In Progress', 'In Review') THEN 1 ELSE 0 END) AS wip,
  AVG(CASE
    WHEN status = 'Done' AND created_at IS NOT NULL AND updated_at IS NOT NULL
    THEN (CAST(updated_at AS TIMESTAMP) - CAST(created_at AS TIMESTAMP)) * 24
    ELSE NULL
  END) AS avg_cycle_time_hours,
  COUNT(*) AS tickets_total,
  SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS tickets_in_progress,
  SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) AS tickets_todo,
  CURRENT_TIMESTAMP AS produced_at
FROM dora_etl_dev.curated_jira_issues
WHERE ingestion_date IS NOT NULL
GROUP BY ingestion_date
ORDER BY ingestion_date DESC
```

#### v_jira_cycle_time
```sql
SELECT
  issue_key,
  ingestion_date,
  status,
  created_at,
  updated_at,
  (CAST(updated_at AS TIMESTAMP) - CAST(created_at AS TIMESTAMP)) * 24 AS cycle_time_hours,
  issue_type,
  priority
FROM dora_etl_dev.curated_jira_issues
WHERE status = 'Done'
  AND created_at IS NOT NULL
  AND updated_at IS NOT NULL
ORDER BY ingestion_date DESC, cycle_time_hours DESC
```

#### v_jira_roi_proxy
```sql
SELECT
  ingestion_date,
  tickets_done,
  avg_cycle_time_hours,
  wip,
  tickets_total,
  CASE
    WHEN tickets_done > 0 THEN (tickets_done * 100.0) / NULLIF(tickets_total, 0)
    ELSE 0
  END AS completion_rate_pct,
  CASE
    WHEN avg_cycle_time_hours < 48 THEN 'Fast'
    WHEN avg_cycle_time_hours < 168 THEN 'Normal'
    ELSE 'Slow'
  END AS cycle_speed_category
FROM dora_etl_dev.v_jira_status_snapshot
```

### 6. Dashboard de Superset (Python)
**Ubicación**: `/tmp/create_jira_roi_dashboard.py`

**Características**:
- ✅ Creado programáticamente (sin UI, sin CSRF)
- ✅ Idempotente (recrea si existe)
- ✅ 5 charts basados en dataset 22
- ✅ Dashboard: "Jira ROI MVP (Athena)"

**Charts**:
1. ROI - Tickets Done (big_number)
2. ROI - WIP (big_number)
3. ROI - Avg Cycle Time Hours (big_number)
4. ROI - KPI Snapshot (table)
5. ROI - Trend (All Dates) (line)

---

## 🚀 Guía de Despliegue Paso a Paso

### Paso 1: Desplegar Infraestructura con CDK

```bash
# Navegar al directorio del proyecto
cd /Users/asquella/fluidra/dashboar-ETL/code-QAdashboard/DORA

# Instalar dependencias (si no están instaladas)
npm install

# Bootstrap CDK (solo primera vez)
npx cdk bootstrap

# Sintetizar CloudFormation template
npx cdk synth

# Deploy stacks (dev)
npx cdk deploy --all --context environment=dev

# Ver outputs
npx cdk deploy --all --outputs-file outputs.json
```

**Recursos creados**:
- ✅ S3 buckets (RAW, CURATED)
- ✅ Lambda function
- ✅ Glue jobs, crawlers, database
- ✅ Athena workgroup
- ✅ IAM roles

### Paso 2: Ingerir Datos de Prueba

```bash
# Obtener nombres de recursos del CDK output
RAW_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name IngestionStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`RawBucketName`].OutputValue' \
  --output text)

# Invocar Lambda manualmente con fecha específica
aws lambda invoke \
  --function-name ingestion-fake-dev \
  --payload '{"ingestionDate": "2026-02-04"}' \
  --region us-west-1 \
  /tmp/lambda-result.json

# Ver resultado
cat /tmp/lambda-result.json

# Verificar datos en S3 RAW
aws s3 ls s3://$RAW_BUCKET/raw/jira/ingestion_date=2026-02-04/
```

### Paso 3: Ejecutar Job de Curación de Jira

```bash
# Obtener nombres de recursos
CURATED_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name AnalyticsStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CuratedBucketName`].OutputValue' \
  --output text)

GLUE_JOB="curate-jira-issues-dev"

# Iniciar job de Glue
aws glue start-job-run \
  --job-name $GLUE_JOB \
  --region us-west-1 \
  --arguments="--run_date=2026-02-04,--raw_bucket=$RAW_BUCKET,--curated_bucket=$CURATED_BUCKET"

# Esperar a que termine (monitorizar)
aws glue get-job-runs \
  --job-name $GLUE_JOB \
  --region us-west-1 \
  --max-results 1
```

**Resultado**:
- Datos transformados de JSON → Parquet
- Ubicación: `s3://$CURATED_BUCKET/curated/jira_issues/ingestion_date=2026-02-04/`

### Paso 4: Ejecutar Crawler para Crear Tabla en Glue Catalog

```bash
CRAWLER_NAME="curated-jira-issues-dev"

# Iniciar crawler
aws glue start-crawler \
  --name $CRAWLER_NAME \
  --region us-west-1

# Esperar a que termine (monitorizar)
watch -n 10 'aws glue get-crawler \
  --name $CRAWLER_NAME \
  --region us-west-1 \
  --query "Crawler.State"'
```

**Resultado**:
- Tabla creada: `dora_etl_dev.curated_jira_issues`

### Paso 5: Ejecutar Job de KPIs

```bash
GLUE_KPI_JOB="build-dora-kpis-dev"

# Iniciar job de KPIs
aws glue start-job-run \
  --job-name $GLUE_KPI_JOB \
  --region us-west-1 \
  --arguments="--run_date=2026-02-04,--curated_bucket=$CURATED_BUCKET"

# Esperar a que termine
aws glue get-job-runs \
  --job-name $GLUE_KPI_JOB \
  --region us-west-1 \
  --max-results 1
```

**Resultado**:
- KPIs calculados
- Ubicación: `s3://$CURATED_BUCKET/analytics/dora_kpis/ingestion_date=2026-02-04/`

### Paso 6: Ejecutar Crawler de KPIs

```bash
KPI_CRAWLER_NAME="analytics-dora-kpis-dev"

# Iniciar crawler
aws glue start-crawler \
  --name $KPI_CRAWLER_NAME \
  --region us-west-1

# Esperar a que termine
watch -n 10 'aws glue get-crawler \
  --name $KPI_CRAWLER_NAME \
  --region us-west-1 \
  --query "Crawler.State"'
```

**Resultado**:
- Tabla creada: `dora_etl_dev.analytics_dora_kpis`

### Paso 7: Crear Vistas en Athena

```bash
WORKGROUP="dora-etl-dev"

# Crear vista v_jira_status_snapshot
aws athena start-query-execution \
  --query-string "CREATE OR REPLACE VIEW dora_etl_dev.v_jira_status_snapshot AS SELECT ingestion_date, SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS tickets_done, SUM(CASE WHEN status IN ('In Progress', 'In Review') THEN 1 ELSE 0 END) AS wip, AVG(CASE WHEN status = 'Done' AND created_at IS NOT NULL AND updated_at IS NOT NULL THEN (CAST(updated_at AS TIMESTAMP) - CAST(created_at AS TIMESTAMP)) * 24 ELSE NULL END) AS avg_cycle_time_hours, COUNT(*) AS tickets_total, SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS tickets_in_progress, SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) AS tickets_todo, CURRENT_TIMESTAMP AS produced_at FROM dora_etl_dev.curated_jira_issues WHERE ingestion_date IS NOT NULL GROUP BY ingestion_date ORDER BY ingestion_date DESC" \
  --work-group $WORKGROUP \
  --region us-west-1

# Crear vista v_jira_cycle_time
aws athena start-query-execution \
  --query-string "CREATE OR REPLACE VIEW dora_etl_dev.v_jira_cycle_time AS SELECT issue_key, ingestion_date, status, created_at, updated_at, (CAST(updated_at AS TIMESTAMP) - CAST(created_at AS TIMESTAMP)) * 24 AS cycle_time_hours, issue_type, priority FROM dora_etl_dev.curated_jira_issues WHERE status = 'Done' AND created_at IS NOT NULL AND updated_at IS NOT NULL ORDER BY ingestion_date DESC, cycle_time_hours DESC" \
  --work-group $WORKGROUP \
  --region us-west-1

# Crear vista v_jira_roi_proxy
aws athena start-query-execution \
  --query-string "CREATE OR REPLACE VIEW dora_etl_dev.v_jira_roi_proxy AS SELECT ingestion_date, tickets_done, avg_cycle_time_hours, wip, tickets_total, CASE WHEN tickets_done > 0 THEN (tickets_done * 100.0) / NULLIF(tickets_total, 0) ELSE 0 END AS completion_rate_pct, CASE WHEN avg_cycle_time_hours < 48 THEN 'Fast' WHEN avg_cycle_time_hours < 168 THEN 'Normal' ELSE 'Slow' END AS cycle_speed_category FROM dora_etl_dev.v_jira_status_snapshot" \
  --work-group $WORKGROUP \
  --region us-west-1
```

### Paso 8: Configurar Superset con Athena

```bash
# Navegar a Superset
cd /Users/asquella/fluidra/dashboar-ETL/code-QAdashboard/DORA/superset-local/superset

# Asegurarse de que Docker containers estén corriendo
docker compose ps

# Acceder a Superset: http://localhost:8088
# Login: admin / admin
```

**Configurar base de datos Athena**:
1. Navegar a Data → Databases
2. Click + Database
3. Database: Athena - dora_etl_dev
4. SQL Alchemy URI: `awsathena+rest://aws_access_key_id:aws_secret_access_key@athena.{region}.amazonaws.com/{catalog}?s3_staging_dir={s3_path}&region_name={region}`
5. Test Connection
6. Connect

**Crear dataset**:
1. Navegar a Data → Datasets
2. Click + Dataset
3. Database: Athena - dora_etl_dev
4. Schema: dora_etl_dev
5. Table: v_jira_status_snapshot
6. Save

### Paso 9: Crear Dashboard en Superset

```bash
# Copiar script de creación de dashboard al contenedor
docker cp /tmp/create_jira_roi_dashboard.py superset-superset-1:/tmp/create_jira_roi_dashboard.py

# Ejecutar script dentro del contenedor
docker exec superset-superset-1 sh -c 'cd /app && python3 /tmp/create_jira_roi_dashboard.py'
```

**Resultado**:
- Dashboard: "Jira ROI MVP (Athena)"
- URL: http://localhost:8088/superset/dashboard/jira-roi-mvp-athena/
- 5 charts creados
- Dataset: v_jira_status_snapshot (ID: 22)

---

## 🧹 Limpieza Total (Eliminación desde Cero)

```bash
# Navegar al directorio del proyecto
cd /Users/asquella/fluidra/dashboar-ETL/code-QAdashboard/DORA

# Eliminar todos los stacks de CDK
npx cdk destroy --all --context environment=dev

# Confirmar eliminación (ingresar 'y' cuando se solicite)

# Verificar que no queden recursos
aws s3 ls
aws lambda list-functions
aws glue list-jobs
aws glue list-crawlers
aws athena list-work-groups
```

**Nota**: Los buckets con `RemovalPolicy.DESTROY` serán eliminados automáticamente en dev.

---

## 📋 Checklist de Verificación

### Infraestructura
- [ ] CDK stacks desplegados
- [ ] S3 buckets creados (RAW, CURATED)
- [ ] Lambda function creada
- [ ] Glue jobs creados (curate-jira-issues, build-dora-kpis)
- [ ] Glue crawlers creados
- [ ] Glue database creada
- [ ] Athena workgroup creado

### Datos
- [ ] Datos ingeridos en S3 RAW
- [ ] Job de curación ejecutado
- [ ] Datos transformados en S3 CURATED
- [ ] Tabla curated_jira_issues en Glue Catalog
- [ ] Job de KPIs ejecutado
- [ ] KPIs en S3 ANALYTICS
- [ ] Tabla analytics_dora_kpis en Glue Catalog

### Vistas de Athena
- [ ] v_jira_status_snapshot creada
- [ ] v_jira_cycle_time creada
- [ ] v_jira_roi_proxy creada

### Superset
- [ ] Base de datos Athena configurada
- [ ] Dataset v_jira_status_snapshot creado
- [ ] Dashboard "Jira ROI MVP (Athena)" creado
- [ ] 5 charts funcionando
- [ ] Datos visibles (tickets_done=1, wip=1, avg_cycle_time_hours=125.5)

---

## 🔄 Recomendaciones para Producción

1. **Cambiar RemovalPolicy**:
   - En production: `RemovalPolicy.RETAIN`
   - No destruir datos accidentalmente

2. **Autenticación**:
   - Usar AWS Secrets Manager para credenciales
   - Rotar secretos regularmente

3. **Monitoreo**:
   - Configurar CloudWatch Alarms
   - Dashboard de métricas en CloudWatch

4. **Escalabilidad**:
   - Ajustar `maxCapacity` de Glue jobs según volumen de datos
   - Usar DPU aprovisionado para jobs grandes

5. **Seguridad**:
   - Usar bucket policies restrictivas
   - Habilitar encryption in-flight (HTTPS)
   - Usar VPC endpoints si aplica

---

## 📚 Referencias

- **CDK**: https://docs.aws.amazon.com/cdk/v2/
- **Glue**: https://docs.aws.amazon.com/glue/
- **Athena**: https://docs.aws.amazon.com/athena/
- **Superset**: https://superset.apache.org/docs/

---

**Estado**: ✅ Documentación completa para despliegue desde cero
**Versión**: v1.0
**Fecha**: 2026-02-05
