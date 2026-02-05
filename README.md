# DORA ETL Dashboard

## 📊 Sobre el Proyecto

Dashboard ETL + ROI para ingeniería que muestra KPIs ejecutivos de DORA:
- **Deployment Frequency**
- **Lead Time**
- **MTTR** (Mean Time To Recovery)
- **Change Failure Rate**

Arquitectura serverless sobre AWS:
- S3 Data Lake (Raw → Curated → Analytics)
- AWS Glue (PySpark)
- AWS Athena
- Apache Superset (Dashboard)

---

## 🚀 Inicio Rápido

### Desplegar desde Cero

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd DORA

# 2. Desplegar infraestructura (automatizado)
./scripts/deploy-from-scratch.sh 2026-02-04

# 3. Esperar ~15 minutos
# El script hace TODO automáticamente

# 4. Ver dashboard
# Navegar a: http://localhost:8088/superset/dashboard/jira-roi-mvp-athena/
```

### Ver Dashboard Existente

```bash
# Si ya está desplegado, navegar a:
http://localhost:8088/superset/dashboard/jira-roi-mvp-athena/
```

---

## 📁 Estructura del Proyecto

```
DORA/
├── infra/                    # CDK stacks (TypeScript)
│   ├── bin/
│   │   └── app.ts         # Entry point
│   └── lib/
│       ├── ingestion-stack.ts    # Stack de ingestión
│       └── analytics-stack.ts   # Stack de analíticas
│
├── glue/                     # Glue PySpark jobs (Python)
│   └── jobs/
│       ├── curate_jira_issues/job-minimal.py   # JSON → Parquet
│       └── build_dora_kpis/job.py              # Curated → KPIs
│
├── src/                      # Código de dominio y handlers
│   └── handlers/
│       └── ingest-fake-data-handler.ts    # Lambda handler
│
├── data/                     # Datos de prueba
│   └── fakes/
│       ├── jira/issues.json    # 3 tickets de ejemplo
│       └── github/pull-requests.json
│
├── scripts/                  # Scripts de automatización
│   ├── deploy-from-scratch.sh              # Deploy completo
│   └── create_jira_roi_dashboard.py       # Dashboard Superset
│
├── docs/                     # Documentación
│   ├── README.md                            # Índice de docs
│   ├── governance/                          # Reglas del proyecto
│   ├── data-contracts/                      # Contratos de datos
│   ├── deployment/                          # Docs de despliegue
│   └── dashboard/                           # Docs de dashboard
│
└── superset-local/           # Superset en Docker
    └── superset/
```

---

## 🛠️ Tecnologías

| Componente | Tecnología |
|------------|------------|
| Infraestructura | AWS CDK v2 (TypeScript) |
| Storage | S3 (Data Lake) |
| ETL | AWS Glue (PySpark) |
| Analytics | AWS Athena |
| Dashboard | Apache Superset |
| Runtime | Node.js 18.x (Lambda) |
| Query Engine | PySpark 3.0 |

---

## 📋 Prerrequisitos

### Requerido
- AWS Account con permisos de administrador
- AWS CLI configurado
- Node.js 18.x+
- Docker y Docker Compose
- Python 3.x

### Opcional
- npx (incluido con Node.js)
- git

---

## 🎯 Casos de Uso

### 1. Ingerir Datos de Jira
```bash
aws lambda invoke \
  --function-name ingestion-fake-dev \
  --payload '{"ingestionDate": "2026-02-04"}' \
  --region us-west-1 \
  /tmp/result.json
```

### 2. Ejecutar Pipeline ETL Manual
```bash
# Paso 1: Job de curación
aws glue start-job-run \
  --job-name curate-jira-issues-dev \
  --arguments="--run_date=2026-02-04"

# Paso 2: Crawler de curación
aws glue start-crawler --name curated-jira-issues-dev

# Paso 3: Job de KPIs
aws glue start-job-run \
  --job-name build-dora-kpis-dev \
  --arguments="--run_date=2026-02-04"

# Paso 4: Crawler de KPIs
aws glue start-crawler --name analytics-dora-kpis-dev
```

### 3. Crear Dashboard en Superset
```bash
# Copiar script al contenedor
docker cp scripts/create_jira_roi_dashboard.py superset-superset-1:/tmp/

# Ejecutar script
docker exec superset-superset-1 python3 /tmp/create_jira_roi_dashboard.py
```

---

## 🗑️ Limpieza

### Eliminar Recursos en AWS
```bash
npx cdk destroy --all --context environment=dev
```

### Detener Superset
```bash
cd superset-local/superset
docker compose down
```

---

## 📚 Documentación

### 📘 Guía Completa
- [Documentación Principal](docs/README.md)
- [Guía de Despliegue](docs/deployment/DEPLOY_FROM_SCRATCH_COMPLETE_GUIDE.md)
- [Resumen Ejecutivo](docs/deployment/EXECUTIVE_SUMMARY_DEPLOY_FROM_SCRATCH.md)

### 📊 Dashboard
- [Provisionamiento](docs/dashboard/JIRA_ROI_DASHBOARD_PROVISIONING_SUCCESS.md)
- [Próximos Pasos](docs/dashboard/NEXT_STEPS_JIRA_ROI_DASHBOARD.md)
- [Implementación](docs/dashboard/JIRA_ROI_DASHBOARD_IMPLEMENTATION_SUMMARY.md)

### 🏛️ Reglas y Convenciones
- [AGENTS.md](AGENTS.md) - Reglas del proyecto
- [Rules](docs/governance/rules.md) - Reglas de ejecución
- [Quality Gates](docs/governance/quality-gates.md) - Gates de calidad
- [CDK Conventions](docs/governance/cdk-conventions.md) - Convenciones CDK
- [Clean Architecture](docs/governance/clean-architecture-ddd.md) - Arquitectura limpia

---

## 🔄 Data Flow

```
┌─────────────┐
│ Jira/GitHub │ (DataSource)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Lambda    │ (IngestFakeData)
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   S3 RAW         │ (JSON)
│  ingestion_date=  │
│     YYYY-MM-DD/   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Glue Job 1    │ (curate-jira-issues)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   S3 CURATED     │ (Parquet)
│  curated/        │
│   jira_issues/  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Glue Crawler   │ (Crea tabla)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Glue Data Catalog│ (Tables)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Glue Job 2    │ (build-dora-kpis)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   S3 ANALYTICS   │ (Parquet)
│  analytics/      │
│   dora_kpis/    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Athena Views   │ (v_jira_status_snapshot)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Superset      │ (Dashboard)
└──────────────────┘
```

---

## ✅ Estado del Proyecto

- ✅ Infraestructura completa (CDK)
- ✅ Scripts ETL (Glue PySpark)
- ✅ Datos de prueba
- ✅ Vistas de Athena
- ✅ Dashboard de Superset
- ✅ Scripts de automatización
- ✅ Documentación completa

---

## 🤝 Contribuyendo

Para contribuir al proyecto, sigue las reglas en:
- [AGENTS.md](AGENTS.md)
- [Governance Rules](docs/governance/rules.md)

Asegúrate de pasar los Quality Gates antes de hacer commit:
- ✅ `npm run build`
- ✅ `npm run lint`
- ✅ `npm test`
- ✅ `npx cdk synth`

---

## 📄 Licencia

[TODO: Agregar licencia]

---

## 📞 Soporte

Para preguntas o issues:
- [TODO: Agregar link de issues]
- [TODO: Agregar email de contacto]

---

**Versión**: v1.0
**Última actualización**: 2026-02-05
**Estado**: ✅ Production Ready
