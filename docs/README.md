# DORA ETL Dashboard - Documentación

## 📚 Índice de Documentación

### 🚀 Despliegue e Infraestructura

1. [Guía Completa de Despliegue desde Cero](./deployment/DEPLOY_FROM_SCRATCH_COMPLETE_GUIDE.md)
   - Paso a paso para desplegar toda la infraestructura
   - Scripts de AWS CLI
   - Troubleshooting y verificación

2. [Resumen Ejecutivo de Despliegue](./deployment/EXECUTIVE_SUMMARY_DEPLOY_FROM_SCRATCH.md)
   - Resumen rápido del proyecto
   - Arquitectura
   - Comandos clave

### 📊 Dashboard de Superset

3. [Resumen de Provisionamiento del Dashboard](./dashboard/JIRA_ROI_DASHBOARD_PROVISIONING_SUCCESS.md)
   - Dashboard creado: "Jira ROI MVP (Athena)"
   - 5 charts explicados
   - Evidencia de creación exitosa

4. [Próximos Pasos del Dashboard](./dashboard/NEXT_STEPS_JIRA_ROI_DASHBOARD.md)
   - Opciones para completar el dashboard
   - Soluciones a problemas comunes
   - Scripts de ejemplo

5. [Resumen de Implementación](./dashboard/JIRA_ROI_DASHBOARD_IMPLEMENTATION_SUMMARY.md)
   - Historial de implementación
   - Problemas encontrados
   - Soluciones aplicadas

---

## 🛠️ Scripts de Automatización

### scripts/deploy-from-scratch.sh
Script automatizado para desplegar toda la infraestructura desde cero.

**Uso:**
```bash
./scripts/deploy-from-scratch.sh 2026-02-04
```

**Qué hace:**
- Despliega stacks de CDK (IngestionStack, AnalyticsStack)
- Ingere datos de prueba
- Ejecuta jobs de Glue (curación + KPIs)
- Ejecuta crawlers de Glue
- Crea vistas en Athena
- Crea dashboard en Superset

**Tiempo estimado:** ~15 minutos

### scripts/create_jira_roi_dashboard.py
Script Python para crear dashboard en Superset programáticamente.

**Uso:**
```bash
docker exec superset-superset-1 python3 /tmp/create_jira_roi_dashboard.py
```

**Qué crea:**
- Dashboard: "Jira ROI MVP (Athena)"
- 5 charts:
  - ROI - Tickets Done (big_number)
  - ROI - WIP (big_number)
  - ROI - Avg Cycle Time Hours (big_number)
  - ROI - KPI Snapshot (table)
  - ROI - Trend (All Dates) (line)

---

## 🏗️ Arquitectura del Proyecto

```
┌─────────────────────────────────────────────────────┐
│              AWS CloudFormation                   │
│  (IngestionStack-dev + AnalyticsStack-dev)      │
└────────────┬──────────────────────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐     ┌──────────┐
│ S3 RAW  │     │ S3 CURA  │
│ Bucket  │     │ TED Bucket│
└────┬────┘     └────┬─────┘
     │                │
     ▼                ▼
┌─────────┐     ┌──────────┐
│ Lambda  │     │  Glue    │
│ Ingest  │     │  Jobs    │
└─────────┘     └────┬─────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Glue Data Catalog│
            │  (Tables/Crawlers)│
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │     Athena       │
            │     (Views)      │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │    Superset     │
            │   (Dashboard)   │
            └──────────────────┘
```

---

## 📋 Componentes del Proyecto

### Infraestructura (CDK - TypeScript)
- `infra/bin/app.ts` - Entry point de CDK
- `infra/lib/ingestion-stack.ts` - Stack de ingestión
- `infra/lib/analytics-stack.ts` - Stack de analíticas

### ETL Jobs (Glue PySpark - Python)
- `glue/jobs/curate_jira_issues/job-minimal.py` - JSON → Parquet
- `glue/jobs/build_dora_kpis/job.py` - Curated → KPIs

### Datos de Prueba
- `data/fakes/jira/issues.json` - 3 tickets de ejemplo
- `src/handlers/ingest-fake-data-handler.ts` - Handler de Lambda

### Vistas de Athena
- `v_jira_status_snapshot` - Métricas diarias
- `v_jira_cycle_time` - Análisis de cycle time
- `v_jira_roi_proxy` - Cálculos de ROI

---

## 🎯 Comandos Rápidos

### Desplegar desde Cero
```bash
./scripts/deploy-from-scratch.sh 2026-02-04
```

### Eliminar Todo
```bash
npx cdk destroy --all --context environment=dev
```

### Ver Dashboard
```bash
# Navegar a:
http://localhost:8088/superset/dashboard/jira-roi-mvp-athena/
```

### Ejecutar Lambda Manualmente
```bash
aws lambda invoke \
  --function-name ingestion-fake-dev \
  --payload '{"ingestionDate": "2026-02-04"}' \
  --region us-west-1 \
  /tmp/result.json
```

---

## ✅ Checklist de Verificación

### Infraestructura
- [ ] CDK stacks desplegados
- [ ] S3 buckets creados (RAW, CURATED)
- [ ] Lambda function creada
- [ ] Glue jobs creados
- [ ] Glue crawlers creados
- [ ] Glue database creada
- [ ] Athena workgroup creado

### Datos
- [ ] Datos ingeridos en S3 RAW
- [ ] Job de curación ejecutado
- [ ] Datos transformados en S3 CURATED
- [ ] Tabla curated_jira_issues creada
- [ ] Job de KPIs ejecutado
- [ ] KPIs en S3 ANALYTICS
- [ ] Tabla analytics_dora_kpis creada

### Vistas de Athena
- [ ] v_jira_status_snapshot creada
- [ ] v_jira_cycle_time creada
- [ ] v_jira_roi_proxy creada

### Superset
- [ ] Base de datos Athena configurada
- [ ] Dataset v_jira_status_snapshot creado
- [ ] Dashboard "Jira ROI MVP (Athena)" creado
- [ ] 5 charts funcionando
- [ ] Datos visibles

---

## 🔄 Guía de Gobierno

Para mantener el código limpio y consistente, sigue las reglas en:
- `/AGENTS.md` - Reglas del proyecto
- `/docs/governance/rules.md` - Reglas de ejecución
- `/docs/governance/quality-gates.md` - Gates de calidad

---

## 📚 Referencias

- **CDK**: https://docs.aws.amazon.com/cdk/v2/
- **Glue**: https://docs.aws.amazon.com/glue/
- **Athena**: https://docs.aws.amazon.com/athena/
- **Superset**: https://superset.apache.org/docs/

---

**Última actualización**: 2026-02-05
**Versión**: v1.0
