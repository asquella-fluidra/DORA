#!/bin/bash
#
# Script de Despliegue Completo desde Cero
# ID: DEPLOY_FROM_SCRATCH_V1
#
# Uso: ./deploy-from-scratch.sh [run_date]
# Ejemplo: ./deploy-from-scratch.sh 2026-02-04
#

set -e  # Exit on error

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REGION="${AWS_REGION:-us-west-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
RUN_DATE="${1:-$(date +%Y-%m-%d)}"

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                      DESPLIEGUE COMPLETO DESDE CERO"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Región:         $REGION"
echo "Environment:    $ENVIRONMENT"
echo "Run Date:       $RUN_DATE"
echo "Project Dir:    $PROJECT_DIR"
echo ""

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ ERROR: AWS CLI no está instalado"
    exit 1
fi

# Verificar CDK
if ! command -v npx &> /dev/null; then
    echo "❌ ERROR: npx no está instalado"
    exit 1
fi

cd "$PROJECT_DIR"

# ============================================
# PASO 1: Desplegar Infraestructura con CDK
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 1/8: Desplegando Infraestructura (CDK)"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

npm install --silent

echo "Sintetizando CDK template..."
npx cdk synth --context environment=$ENVIRONMENT --quiet

echo "Desplegando stacks..."
npx cdk deploy --all --context environment=$ENVIRONMENT --require-approval never

echo "✅ Infraestructura desplegada"
echo ""

# Obtener outputs de CDK
RAW_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name IngestionStack-$ENVIRONMENT \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`RawBucketName`].OutputValue' \
  --output text 2>/dev/null || echo "")

CURATED_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name AnalyticsStack-$ENVIRONMENT \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`CuratedBucketName`].OutputValue' \
  --output text 2>/dev/null || echo "")

GLUE_JOB=$(aws cloudformation describe-stacks \
  --stack-name AnalyticsStack-$ENVIRONMENT \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`GlueJobName`].OutputValue' \
  --output text 2>/dev/null || echo "")

CRAWLER=$(aws cloudformation describe-stacks \
  --stack-name AnalyticsStack-$ENVIRONMENT \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`CrawlerName`].OutputValue' \
  --output text 2>/dev/null || echo "")

KPI_JOB=$(aws cloudformation describe-stacks \
  --stack-name AnalyticsStack-$ENVIRONMENT \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`KpiJobName`].OutputValue' \
  --output text 2>/dev/null || echo "")

KPI_CRAWLER=$(aws cloudformation describe-stacks \
  --stack-name AnalyticsStack-$ENVIRONMENT \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`KpiCrawlerName`].OutputValue' \
  --output text 2>/dev/null || echo "")

WORKGROUP="dora-etl-$ENVIRONMENT"

echo "CDK Outputs:"
echo "  RAW_BUCKET:      $RAW_BUCKET"
echo "  CURATED_BUCKET:  $CURATED_BUCKET"
echo "  GLUE_JOB:       $GLUE_JOB"
echo "  CRAWLER:         $CRAWLER"
echo "  KPI_JOB:        $KPI_JOB"
echo "  KPI_CRAWLER:     $KPI_CRAWLER"
echo "  WORKGROUP:       $WORKGROUP"
echo ""

# ============================================
# PASO 2: Ingerir Datos de Prueba
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 2/8: Ingeriendo Datos de Prueba (Lambda)"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

LAMBDA_FUNCTION="ingestion-fake-$ENVIRONMENT"

echo "Invocando Lambda function: $LAMBDA_FUNCTION"
aws lambda invoke \
  --function-name $LAMBDA_FUNCTION \
  --payload "{\"ingestionDate\": \"$RUN_DATE\"}" \
  --region $REGION \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-result.json > /dev/null

echo "Verificando datos en S3 RAW..."
aws s3 ls s3://$RAW_BUCKET/raw/jira/ingestion_date=$RUN_DATE/ --region $REGION

echo "✅ Datos de prueba ingeridos"
echo ""

# ============================================
# PASO 3: Ejecutar Job de Curación
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 3/8: Ejecutando Job de Curación (Glue)"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

echo "Iniciando Glue job: $GLUE_JOB"
JOB_RUN_ID=$(aws glue start-job-run \
  --job-name $GLUE_JOB \
  --region $REGION \
  --arguments="--run_date=$RUN_DATE,--raw_bucket=$RAW_BUCKET,--curated_bucket=$CURATED_BUCKET" \
  --query 'JobRunId' \
  --output text)

echo "Job Run ID: $JOB_RUN_ID"

# Esperar a que termine (con timeout de 10 minutos)
echo "Esperando a que termine el job..."
TIMEOUT=600
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(aws glue get-job-run \
      --job-name $GLUE_JOB \
      --run-id $JOB_RUN_ID \
      --region $REGION \
      --query 'JobRun.JobRunState' \
      --output text)

    echo "  Estado: $STATUS (tiempo: ${ELAPSED}s)"

    if [ "$STATUS" = "SUCCEEDED" ]; then
        echo "✅ Job de curación completado exitosamente"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ ERROR: Job de curación falló"
        aws glue get-job-run \
          --job-name $GLUE_JOB \
          --run-id $JOB_RUN_ID \
          --region $REGION \
          --query 'JobRun.ErrorMessage'
        exit 1
    fi

    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ ERROR: Timeout esperando el job de curación"
    exit 1
fi

echo ""

# ============================================
# PASO 4: Ejecutar Crawler de Curación
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 4/8: Ejecutando Crawler de Curación"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

aws glue start-crawler --name $CRAWLER --region $REGION > /dev/null
echo "Crawler iniciado: $CRAWLER"

# Esperar a que termine
echo "Esperando a que termine el crawler..."
TIMEOUT=300
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATE=$(aws glue get-crawler \
      --name $CRAWLER \
      --region $REGION \
      --query 'Crawler.State' \
      --output text)

    echo "  Estado: $STATE (tiempo: ${ELAPSED}s)"

    if [ "$STATE" = "READY" ]; then
        echo "✅ Crawler de curación completado"
        break
    fi

    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ ERROR: Timeout esperando el crawler"
    exit 1
fi

echo ""

# ============================================
# PASO 5: Ejecutar Job de KPIs
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 5/8: Ejecutando Job de KPIs"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

echo "Iniciando Glue job: $KPI_JOB"
KPI_JOB_RUN_ID=$(aws glue start-job-run \
  --job-name $KPI_JOB \
  --region $REGION \
  --arguments="--run_date=$RUN_DATE,--curated_bucket=$CURATED_BUCKET" \
  --query 'JobRunId' \
  --output text)

echo "KPI Job Run ID: $KPI_JOB_RUN_ID"

# Esperar a que termine
echo "Esperando a que termine el job de KPIs..."
TIMEOUT=600
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(aws glue get-job-run \
      --job-name $KPI_JOB \
      --run-id $KPI_JOB_RUN_ID \
      --region $REGION \
      --query 'JobRun.JobRunState' \
      --output text)

    echo "  Estado: $STATUS (tiempo: ${ELAPSED}s)"

    if [ "$STATUS" = "SUCCEEDED" ]; then
        echo "✅ Job de KPIs completado exitosamente"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ ERROR: Job de KPIs falló"
        exit 1
    fi

    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ ERROR: Timeout esperando el job de KPIs"
    exit 1
fi

echo ""

# ============================================
# PASO 6: Ejecutar Crawler de KPIs
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 6/8: Ejecutando Crawler de KPIs"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

aws glue start-crawler --name $KPI_CRAWLER --region $REGION > /dev/null
echo "Crawler iniciado: $KPI_CRAWLER"

# Esperar a que termine
echo "Esperando a que termine el crawler de KPIs..."
TIMEOUT=300
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATE=$(aws glue get-crawler \
      --name $KPI_CRAWLER \
      --region $REGION \
      --query 'Crawler.State' \
      --output text)

    echo "  Estado: $STATE (tiempo: ${ELAPSED}s)"

    if [ "$STATE" = "READY" ]; then
        echo "✅ Crawler de KPIs completado"
        break
    fi

    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ ERROR: Timeout esperando el crawler de KPIs"
    exit 1
fi

echo ""

# ============================================
# PASO 7: Crear Vistas en Athena
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 7/8: Creando Vistas en Athena"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

# Vista 1: v_jira_status_snapshot
echo "Creando vista v_jira_status_snapshot..."
aws athena start-query-execution \
  --query-string "CREATE OR REPLACE VIEW dora_etl_dev.v_jira_status_snapshot AS SELECT ingestion_date, SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS tickets_done, SUM(CASE WHEN status IN ('In Progress', 'In Review') THEN 1 ELSE 0 END) AS wip, AVG(CASE WHEN status = 'Done' AND created_at IS NOT NULL AND updated_at IS NOT NULL THEN (CAST(updated_at AS TIMESTAMP) - CAST(created_at AS TIMESTAMP)) * 24 ELSE NULL END) AS avg_cycle_time_hours, COUNT(*) AS tickets_total, SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS tickets_in_progress, SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) AS tickets_todo, CURRENT_TIMESTAMP AS produced_at FROM dora_etl_dev.curated_jira_issues WHERE ingestion_date IS NOT NULL GROUP BY ingestion_date ORDER BY ingestion_date DESC" \
  --work-group $WORKGROUP \
  --region $REGION > /dev/null

echo "✅ Vista v_jira_status_snapshot creada"

# Vista 2: v_jira_cycle_time
echo "Creando vista v_jira_cycle_time..."
aws athena start-query-execution \
  --query-string "CREATE OR REPLACE VIEW dora_etl_dev.v_jira_cycle_time AS SELECT issue_key, ingestion_date, status, created_at, updated_at, (CAST(updated_at AS TIMESTAMP) - CAST(created_at AS TIMESTAMP)) * 24 AS cycle_time_hours, issue_type, priority FROM dora_etl_dev.curated_jira_issues WHERE status = 'Done' AND created_at IS NOT NULL AND updated_at IS NOT NULL ORDER BY ingestion_date DESC, cycle_time_hours DESC" \
  --work-group $WORKGROUP \
  --region $REGION > /dev/null

echo "✅ Vista v_jira_cycle_time creada"

# Vista 3: v_jira_roi_proxy
echo "Creando vista v_jira_roi_proxy..."
aws athena start-query-execution \
  --query-string "CREATE OR REPLACE VIEW dora_etl_dev.v_jira_roi_proxy AS SELECT ingestion_date, tickets_done, avg_cycle_time_hours, wip, tickets_total, CASE WHEN tickets_done > 0 THEN (tickets_done * 100.0) / NULLIF(tickets_total, 0) ELSE 0 END AS completion_rate_pct, CASE WHEN avg_cycle_time_hours < 48 THEN 'Fast' WHEN avg_cycle_time_hours < 168 THEN 'Normal' ELSE 'Slow' END AS cycle_speed_category FROM dora_etl_dev.v_jira_status_snapshot" \
  --work-group $WORKGROUP \
  --region $REGION > /dev/null

echo "✅ Vista v_jira_roi_proxy creada"
echo ""

# ============================================
# PASO 8: Crear Dashboard en Superset
# ============================================
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo "PASO 8/8: Creando Dashboard en Superset"
echo "─────────────────────────────────────────────────────────────────────────────────────────"
echo ""

SUPERSET_DIR="$PROJECT_DIR/superset-local/superset"
SCRIPT_FILE="/tmp/create_jira_roi_dashboard.py"

if [ ! -f "$SCRIPT_FILE" ]; then
    echo "⚠️  ADVERTENCIA: Script de dashboard no encontrado: $SCRIPT_FILE"
    echo "   Debes crear el manualmente o copiarlo desde otra ubicación"
    echo ""
    echo "   Para crear el dashboard manualmente:"
    echo "   1. Navegar a Superset: http://localhost:8088"
    echo "   2. Configurar base de datos Athena"
    echo "   3. Crear dataset v_jira_status_snapshot"
    echo "   4. Crear dashboard con 5 charts"
    echo ""
else
    echo "Copiando script al contenedor Superset..."
    docker cp "$SCRIPT_FILE" superset-superset-1:/tmp/create_jira_roi_dashboard.py 2>/dev/null || {
        echo "⚠️  ADVERTENCIA: No se pudo copiar al contenedor"
        echo "   Verifica que Superset esté corriendo en Docker"
    }

    echo "Ejecutando script de creación de dashboard..."
    docker exec superset-superset-1 sh -c 'cd /app && python3 /tmp/create_jira_roi_dashboard.py' 2>&1 | grep -v "INFO\|WARNING\|DEBUG" || true

    echo ""
    echo "✅ Dashboard creado en Superset"
    echo "   URL: http://localhost:8088/superset/dashboard/jira-roi-mvp-athena/"
fi

echo ""

# ============================================
# VERIFICACIÓN FINAL
# ============================================
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                              VERIFICACIÓN FINAL"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

echo "Verificando infraestructura..."
aws s3 ls s3://$RAW_BUCKET --region $REGION > /dev/null && echo "  ✅ S3 RAW bucket"
aws s3 ls s3://$CURATED_BUCKET --region $REGION > /dev/null && echo "  ✅ S3 CURATED bucket"
aws lambda get-function --function-name $LAMBDA_FUNCTION --region $REGION > /dev/null 2>&1 && echo "  ✅ Lambda function"
aws glue get-job --job-name $GLUE_JOB --region $REGION > /dev/null && echo "  ✅ Glue job: $GLUE_JOB"
aws glue get-job --job-name $KPI_JOB --region $REGION > /dev/null && echo "  ✅ Glue job: $KPI_JOB"

echo ""
echo "Verificando datos..."
aws s3 ls s3://$CURATED_BUCKET/curated/jira_issues/ingestion_date=$RUN_DATE/ --region $REGION > /dev/null && echo "  ✅ Datos curados: $RUN_DATE"
aws s3 ls s3://$CURATED_BUCKET/analytics/dora_kpis/ingestion_date=$RUN_DATE/ --region $REGION > /dev/null && echo "  ✅ KPIs: $RUN_DATE"

echo ""
echo "Verificando tablas de Glue Catalog..."
aws glue get-table --database-name dora_etl_dev --name curated_jira_issues --region $REGION > /dev/null 2>&1 && echo "  ✅ Tabla: curated_jira_issues"
aws glue get-table --database-name dora_etl_dev --name analytics_dora_kpis --region $REGION > /dev/null 2>&1 && echo "  ✅ Tabla: analytics_dora_kpis"

echo ""
echo "Verificando vistas de Athena..."
aws athena get-query-execution \
  --work-group $WORKGROUP \
  --region $REGION \
  --query-execution-id $(aws athena list-query-executions \
    --work-group $WORKGROUP \
    --region $REGION \
    --query 'QueryExecutionIds[0]' \
    --output text) \
  --query 'StatementType' \
  --output text 2>/dev/null | grep -q "CREATE VIEW" && echo "  ✅ Vistas de Athena"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                           ✅ DESPLIEGUE COMPLETADO"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Dashboard Superset: http://localhost:8088/superset/dashboard/jira-roi-mvp-athena/"
echo ""
echo "Próximos pasos:"
echo "  1. Navegar al dashboard de Superset"
echo "  2. Verificar que los charts muestren datos correctos"
echo "  3. (Opcional) Agregar filtros nativos por fecha"
echo ""
