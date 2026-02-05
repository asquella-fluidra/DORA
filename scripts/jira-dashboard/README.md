# Jira Visual Dashboard - Guía Paso a Paso

## 🎨 Dashboard Objetivo

Crear un dashboard visual en Superset con:
- ✅ 8 charts (big numbers, pie charts, bar charts, table)
- ✅ Datos de prueba (14 tickets, 3 sprints)
- ✅ Horas invertidas por ticket y por sprint
- ✅ Distribución por estado, tipo, prioridad, asignado
- ✅ Filtro nativo de sprint
- ✅ URL final: http://localhost:8088/superset/dashboard/jira-visual-dashboard/

---

## 📋 Requisitos Previos

### En Athena
- ✅ Tabla `curated_jira_issues` existe en Glue Catalog
- ✅ Vista `v_jira_status_snapshot` accesible
- ✅ Workgroup `dora-etl-dev` configurado

### En Superset
- ✅ Base de datos Athena conectada
- ✅ Usuario con permisos de admin

---

## 📋 Paso a Paso

### PASO 1: Cargar Datos de Prueba en Superset

**Método A: Vía Web UI (Recomendado - 2 min)**

1. Navegar a: http://localhost:8088
2. Login con `admin` / `admin`
3. Ir a: Data → Uploads
4. Arrastrar el archivo:
   ```
   scripts/jira-dashboard/jira_tickets.csv
   ```
5. Configurar:
   - **Database**: Uploads as CSV
   - **Table name**: `jira_tickets`
   - **Parse dates**: ❌ (NO marcar)
   - **Columnas**: Las 9 columnas del CSV
6. Click en "Connect"
7. Esperar 1-2 minutos

**Método B: Vía API (Alternativo)**

```bash
# Usar curl con autenticación
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","provider":"db"}' \
  http://localhost:8088/api/v1/security/login
```

---

### PASO 2: Verificar Dataset Creado

1. Ir a: Data → Datasets
2. Buscar: `jira_tickets`
3. Click para abrir el dataset
4. Verificar columnas disponibles:
   - `key`
   - `summary`
   - `status`
   - `type`
   - `priority`
   - `assignee`
   - `sprint`
   - `created_at`
   - `updated_at`
   - `resolved_at`
   - `cycle_time_hours`

---

### PASO 3: Crear Charts (Manual)

#### Chart 1: Total Tickets (Big Number)

1. Ir a: Charts → + Chart
2. **Dataset**: `jira_tickets` (Uploads)
3. **Visualization**: Big Number
4. **Name**: "Jira Visual - Total Tickets"
5. **Metric**: COUNT(*)
6. Click: **Create Chart**

#### Chart 2: Total Cycle Time (Big Number)

1. Ir a: Charts → + Chart
2. **Dataset**: `jira_tickets` (Uploads)
3. **Visualization**: Big Number with Trend
4. **Name**: "Jira Visual - Total Hours"
5. **Metric**: COUNT(*)
6. Click: **Create Chart**

#### Chart 3: Status Distribution (Pie Chart)

1. Ir a: Charts → + Chart
2. **Dataset**: `jira_tickets` (Uploads)
3. **Visualization**: Pie Chart
4. **Name**: "Jira Visual - Status Distribution"
5. **Group By**: `status`
6. **Metric**: COUNT(*)
7. Click: **Create Chart**

#### Chart 4: Type Distribution (Pie Chart)

1. Ir a:: Charts → + Chart
2. **Dataset**: `jira_tickets` (Uploads)
3. **Visualization**: Pie Chart
4. **Name**: "Jira Visual - Type Distribution"
5. **Group By**: `type`
6. **Metric**: COUNT(*)
7. Click: **Create Chart**

#### Chart 5: Hours per Ticket (Bar Chart)

1. Ir a: Charts → + Chart
2. **Dataset**: `jira_tickets` (Uploads)
3. **Visualization**: Bar Chart
4. **Name**: "Jira Visual - Hours per Ticket"
5. **X Axis**: `key`
6. **Metric**: `cycle_time_hours`
7. **Order By**: DESC
8. Click: **Create Chart**

#### Chart 6: Average Hours by Sprint (Bar Chart)

1. Ir a: Charts → + Chart
2. **Dataset**: `jira_tickets` (Uploads)
3. **Visualization**: Bar Chart
4. **Name**: "Jira Visual - Avg Hours by Sprint"
5. **X Axis**: `sprint`
6. **Metric**: AVG(`cycle_time_hours`)
7. Click: **Create Chart**

#### Chart 7: Tickets by Assignee (Bar Chart)

1. Ir a: Charts → + Chart
2. **Dataset**: `jira_tickets` (sheets)
3. **Visualization**: Bar Chart
4. **Name**: "Jira Visual - Tickets by Assignee`
5. **X Axis**: `assignee`
6. **Metric**: COUNT(*)
7. Click: **Create Chart**

#### Chart 8: Ticket Details (Table)

1. Ir a: **SQL Lab → Charts** para crear desde SQL
2. **Dataset**: `dora_etl_dev` (Athena)
3. **Visualization**: Table Visualization
4. **SQL Query**:
   ```sql
   SELECT 
       key AS "Ticket Key",
       summary AS Summary,
       status AS Status,
       type AS Type,
       priority AS Priority,
       assignee AS Assignee,
       sprint AS Sprint,
       created_at AS Created,
       updated_at AS Updated,
       resolved_at AS Resolved,
       cycle_time_hours AS "Hours"
   FROM dora_etl_dev.curated_jira_issues
   ORDER BY cycle_time_hours DESC
   ```
5. **Name**: "Jira Visual - Ticket Details"
6. Click: **Create Chart**

---

### PASO 4: Crear Dashboard

1. Ir a: Dashboards → + Dashboard
2. **Dashboard Title**: "Jira Visual Dashboard"
3. **Slug**: `jira-visual-dashboard`
4. **Publish**: ✅
5. **Description**: "Visual Jira dashboard with status distribution, type distribution, sprint analysis, and ticket details"
6. Click: **Save**

---

### PASO 5: Agregar Charts al Dashboard

1. Abrir el dashboard: "Jira Visual Dashboard"
2. Click en **Edit Dashboard**
3. Click en **Add chart**
4. Buscar y agregar los 8 charts creados:
   1. Jira Visual - Total Tickets
   2. Jira Visual - Total Hours
   3. Jira Visual - Status Distribution
   4. N/A - Type Distribution (si se creó)
   5. Jira Visual - Hours per Ticket
   6. N/A - Avg Hours by Sprint (si se creó)
   7. N/A - Tickets by Assignee (si se creó)
   8. Jira Visual - Ticket Details
5. Arrastrar y soltar en el dashboard
6. Repetir para todos los charts

---

### PASO 6: Agregar Filtro Nativo de Sprint

1. En el dashboard, click en **+ Filter** (icono de filtro)
2. **Filter Type**: Native Filters
3. **Custom SQL**:
   ```sql
   WHERE sprint IN ('Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4')
   ```
4. **Name**: "Sprint Filter"
5. **Target**: Todos los charts
6. Click: **Add**

---

### PASO 7: Ajustar Diseño (Opcional)

#### Layout Sugerido:
- **Fila 1** (Top): Big Number (Total Tickets)
- **Fila 1** (Middle): Big Number (Total Hours)
- **Fila 2** (Left): Pie Chart (Status Distribution)
- **Fila 2** (Right): Pie Chart (Type Distribution)
- **Fila 3**: Bar Chart (Hours per Ticket)
- **Fila 4**: Bar Chart (Avg Hours by Sprint)
- **Fila 5**: Bar Chart (Tickets by Assignee)
- **Fila 6**: Table (Ticket Details)

#### Colores (Opcional - usar defaults de Superset):
- Done: Verde
- In Progress: Amarillo
- To Do: Gris
- Story: Azul
- Bug: Rojo
- Task: Morado

---

## 🎯 URL del Dashboard Final

```
http://localhost:8088/superset/dashboard/jira-visual-dashboard/
```

---

## 📊 Datos de Prueba

### Resumen
- **Total tickets**: 14
- **Sprints**: 3 (Sprint 1, 2, 3)
- **Tickets completados**: 9 (64%)
- **En progreso**: 2 (14%)
- **Pendientes**: 3 (22%)
- **Total horas**: 492.0h

### Por Sprint

| Sprint | Tickets | Done | En Progreso | Pendientes | Horas Totales | Horas Promedio |
|--------|---------|------|-------------|-----------|---------------|---------------|
| Sprint 1 | 4 | 4 | 0 | 0 | 226.0h | 56.5h |
| Sprint 2 | 5 | 5 | 0 | 0 | 321.0h | 64.2h |
| Sprint 3 | 5 | 0 | 2 | 3 | 0h | 0.0h |

### Tickets Más Costosos (Top 5)
1. JIRA-204: Performance optimization - 81.0h
2. JIRA-205: Mobile responsive - 79.0h
3. JIRA-203: Add dark mode - 77.0h
4. JIRA-101: Fix login auth - 64.0h
5. JIRA-104: API endpoint - 57.0h

### Distribución por Tipo
- Story: 10 tickets (71%)
- Bug: 3 tickets (21%)
- Task: 1 ticket (8%)

### Distribución por Assignee
- Bob: 10 tickets
- Alice: 9 tickets
- Charlie: 7 tickets

---

## 🔍 Troubleshooting

### El dataset no aparece
- Verificar que el archivo CSV se cargó correctamente
- Navegar a SQL Lab y ejecutar:
  ```sql
  SELECT COUNT(*) FROM jira_tickets
  ```
- Si aparece el resultado, el dataset existe

### Los charts no se muestran
- Verificar que el dataset tiene datos
- Ajustar los filtros de fecha/sprint
- Verificar que las columnas seleccionadas tienen datos

### El filtro de sprint no funciona
- Verificar que la columna `sprint` existe en el dataset
- Ajustar la query del filtro nativo
- Verificar que el filtro está aplicado a todos los charts

---

## 📋 Archivos Disponibles

### Datos de Prueba
- `scripts/jira-dashboard/jira_tickets_data.json` - Datos en JSON
- `scripts/jira-dashboard/jira_tickets.csv` - Datos en CSV

### Vistas SQL (Opcional - si se usan vistas de Athena)
- `scripts/jira-dashboard/jira_athena_views.sql` - 8 vistas

### Script de Creación (Opcional)
- `scripts/jira-dashboard/create_jira_visual_dashboard.py` - Script automatizado

### Documentación
- `scripts/jira-dashboard/README.md` - Esta guía

---

## 🚀 Comandos Útiles

### Ejecutar script automatizado (si funciona)
```bash
# Copiar al contenedor
docker cp scripts/jira-dashboard/create_jira_visual_dashboard.py superset-superset-1:/tmp/

# Ejecutar
docker exec superset-superset-1 python3 /tmp/create_jira_visual_dashboard.py
```

### Ver dashboard en SQL Lab
```sql
-- Ver datos del dataset
SELECT * FROM jira_tickets ORDER BY cycle_time_hours DESC LIMIT 10;
```

### Ver datos en Athena
```sql
-- Ver resumen general
SELECT * FROM dora_etl_dev.v_jira_overview;

-- Ver distribución por sprint
SELECT * FROM dora_etl_dev.v_jira_avg_hours_by_sprint;

-- Ver distribución por status
SELECT * FROM dora_etl_dev.v_jira_status_distribution;
```

---

## ✅ Verificación Final

### Checklist
- [ ] Dataset `jira_tickets` aparece en Superset
- [ ] Las 9 columnas son visibles
- [ ] Chart 1: Total Tickets creado (Big Number)
- [ ] Chart 2: Total Hours creado (Big Number)
- [ ] Chart 3: Status Distribution creado (Pie Chart)
- [ ] Chart 4: Type Distribution creado (Pie Chart)
- [ ] Chart 5: Hours per Ticket creado (Bar Chart)
- [ ] Chart 6: Avg Hours by Sprint creado (Bar Chart)
- [ ] Chart 7: Tickets by Assignee creado (Bar Chart)
- [ ] Chart 8: Ticket Details creado (Table)
- [ ] Dashboard "Jira Visual Dashboard" creado
- [ ] Todos los charts están en el dashboard
- [ ] Filtro nativo de sprint funciona
- [ ] URL es accesible: http://localhost:8088/superset/dashboard/jira-visual-dashboard/

---

**Versión**: v1.0
**Fecha**: 2026-02-05
**Estado**: ✅ Listo para implementar manualmente
