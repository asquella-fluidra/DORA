# Jira Visual Dashboard - Concepto y Diseño

## 🎨 Dashboard en Superset

### URL del Dashboard
```
http://localhost:8088/superset/dashboard/jira-visual-dashboard/
```

---

## 📊 Layout del Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Jira Visual Dashboard                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │                 │  │                 │  │                 │         │
│  │      14 Tickets       │ │      492.0 Hours      │ │      56.5 Hours        │         │
│  │      Total             │ │      Total Cycle       │ │      Avg per          │         │
│  │                        │  │                        │  │                        │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐  │         │
│  │     Status Distribution            │  │      Type Distribution             │  │         │
│  │                                 │  │                                 │  │         │
│  │   ● Done (9)          ████████  64%  │  ● Story (10)         ████████ 71%   │  │         │
│  │   ● In Progress (2)   ████   14%         │   ● Bug (3)           ████  21%   │  │         │
│  │   ● To Do (3)          ████  22%         │   ● Task (1)           ████  8%     │  │         │
│  │                                 │  │                                 │  │         │
│  └─────────────────────────────────────┘  └─────────────────────────────────────┘  │         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │              Hours per Ticket (Bar Chart - Top 10)                       │  │
│  │                                                             │ │         │
│  │  JIRA-204  ████████████████████████████████████████████  81.0h        │         │
│  │  JIRA-205  ████████████████████████████████████████████  79.0h        │         │
│  │  JIRA-203  ████████████████████████████████████████████ 77.0h        │         │
│  │  JIRA-101  ████████████████████████████████████████████ 64.0h        │         │
│  │  JIRA-104  ████████████████████████████████████████████ 57.0h        │         │
│  │  JIRA-201  ████████████████████████████████████████████ 56.0h        │         │
│  │  JIRA-102  ████████████████████████████████████████████ 54.0h        │         │
│  │  JIRA-103  ████████████████████████████████████████████ 51.0h        │         │
│  │  JIRA-202  ████████████████████████████████████████████ 28.0h        │         │
│  │                                                             │ │         │
│  └─────────────────────────────────────────────────────────────────────────────┘  │         │
│                                                                         │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐  │         │
│  │     Average Hours by Sprint              │ │     Tickets by Assignee       │  │         │
│  │                                      │ │                               │ │         │
│  │  Sprint 1  56.5h  ████████████             │ │   Bob     10 tickets  ████████████            │         │
│  │  Sprint 2 64.2h  ████████████████             │ │   Alice    9 tickets  ████████████            │         │
│  │  Sprint 3  (In Progress)             │ │   Charlie   7 tickets  ████████████            │         │
│  │                                      │ │                               │ │         │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘  │         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│ │                    Ticket Details Table                                │
│ │                                                                          │
│  │  Key      | Summary                  │ Status │ Type   │ Hours │ Sprint  │
│  │  JIRA-204 │ Performance optimization    │ Done   │ Task   │ 81.0h  │ Sp2     │
│  │  JIRA-205 │ Mobile responsive      │ Done   │ Story  │ 79.0h │ Sp2     │
│  │  JIRA-203 │ Add dark mode          │ Done   │ Story  │ 77.0h │ Sp2     │
│  │  JIRA-101 │ Fix login auth          │ Done   │ Bug    │ 64.0h │ Sp1     │
│  │  JIRA-104 │ API endpoint           │ Done   │ Story  │ 57.0h │ Sp1     │
│  │  JIRA-201 │ Implement search       │ Done   │ Story  │ 56.0h │ Sp2     │
│  │  JIRA-102 | User profile page       │ Done   │ Story  │ 54.0h │ Sp1     │
│  │  JIRA-103 │ Update CSS             │ Done   │ Task   │ 51.0h │ Sp1     │
│  │  JIRA-202 │ Fix navigation bug     │ Done   │ Bug    │ 28.0h │ Sp2     │
│  │  JIRA-301 │ Notifications          │ In Prog│ Story  │ -      │ Sp3     │
│  │  JIRA-302 | File upload            │ In Prog│ Story  │ -      │ Sp3     │
│  │  JIRA-303 │ User settings          │ To Do  │ Story  │ -      │ Sp3     │
│  │  JIRA-304 │ Export to CSV           │ To Do  │ Task   │ -      │ Sp3     │
│  │  │  │                  │        │       │        │         │         │
│  └─────────────────────────────────────────────────────────────────────────────┘  │         │
│                                                                         │
│  [📋 Sprint Filter: All ▼]                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Detalle de Charts

### 1. Big Number: Total Tickets
- **Tipo**: Big Number
- **Métrica**: COUNT(*) de todos los tickets
- **Valor**: 14 tickets
- **Color**: Azul (#2893B3)
- **Descripción**: Total de tickets en Jira

### 2. Big Number: Total Hours
- **Tipo**: Big Number
- **Métrica**: SUM(cycle_time_hours)
- **Valor**: 492.0 horas
- **Color**: Verde (#5AC189)
- **Descripción**: Total de horas invertidas en tickets completados

### 3. Pie Chart: Status Distribution
- **Tipo**: Pie Chart
- **Grupo por**: status
- **Métrica**: COUNT(*)
- **Segmentos**:
  - Done: 9 tickets (64%) - Color verde
  - In Progress: 2 tickets (14%) - Color amarillo
  - To Do: 3 tickets (22%) - Color gris
- **Descripción**: Distribución de tickets por estado actual

### 4. Pie Chart: Type Distribution
- **Tipo**: Pie Chart
- **Grupo por**: type
- **Métrica**: COUNT(*)
- **Segmentos**:
  - Story: 10 tickets (71%) - Color azul
  - Bug: 3 tickets (21%) - Color rojo
  - Task: 1 ticket (8%) - Color morado
- **Descripción**: Distribución de tickets por tipo de issue

### 5. Bar Chart: Hours per Ticket
- **Tipo**: Bar Chart (Horizontal)
- **Eje X**: ticket_key
- **Eje Y**: cycle_time_hours
- **Filtro**: cycle_time_hours IS NOT NULL
- **Top**: 10 tickets con más horas
- **Colores**: Gradiente de azul a verde
- **Descripción**: Horas invertidas en cada ticket (completados)
- **Top 5**: JIRA-204 (81.0h), JIRA-205 (79.0h), JIRA-203 (77.0h), JIRA-101 (64.0h), JIRA-104 (57.0h)

### 6. Bar Chart: Average Hours by Sprint
- **Tipo**: Bar Chart (Vertical)
- **Eje X**: sprint
- **Eje Y**: AVG(cycle_time_hours)
- **Datos**:
  - Sprint 1: 56.5 horas promedio
  - Sprint 2: 64.2 horas promedio
  - Sprint 3: (en progreso)
- **Colores**: Diferentes colores por sprint
- **Descripción**: Promedio de horas por sprint para identificar tendencias

### 7. Bar Chart: Tickets by Assignee
- **Tipo**: Bar Chart (Vertical)
- **Eje X**: assignee
- **Eje Y**: COUNT(*)
- **Datos**:
  - Bob: 10 tickets
  - Alice: 9 tickets
  - Charlie: 7 tickets
- **Colores**: Azul, verde, morado
- **Descripción**: Distribución de tickets por persona asignada

### 8. Table: Ticket Details
- **Tipo**: Table
- **Columnas**:
  - ticket_key
  - summary
  - status
  - type
  - priority
  - assignee
  - sprint
  - cycle_time_hours
- **Orden**: cycle_time_hours DESC
- **Filtros**:
  - Búsqueda de texto
  - Filtro de sprint (native filter)
- **Descripción**: Tabla detallada con todos los tickets

---

## 🎯 Filtros Nativos

### Sprint Filter (Dropdown)
- **Tipo**: Filter Box / Select
- **Columna**: sprint
- **Opciones**: All, Sprint 1, Sprint 2, Sprint 3
- **Comportamiento**: Filtra todos los charts simultáneamente

### Search Filter (Text)
- **Tipo**: Filter Box / Search
- **Columna**: summary
- **Comportamiento**: Filtra tabla de tickets por texto

---

## 📊 Métricas Clave

### Sprint 1
- **Tickets completados**: 4
- **Horas totales**: 226.0h
- **Promedio**: 56.5h
- **Más largo**: JIRA-101 (64.0h)
- **Más corto**: JIRA-103 (51.0h)

### Sprint 2
- **Tickets completados**: 5
- **Horas totales**: 321.0h
- **Promedio**: 64.2h
- **Más largo**: JIRA-204 (81.0h)
- **Más corto**: JIRA-202 (28.0h)

### Sprint 3 (En progreso)
- **Tickets asignados**: 5
- **Tickets completados**: 0
- **En progreso**: 2
- **Pendientes**: 3

---

## 💡 Insights que Proporciona el Dashboard

### 1. Eficiencia por Sprint
- Sprint 2 tuvo 13% más tiempo promedio que Sprint 1
- Posible aumento de complejidad o tamaño de tickets

### 2. Tickets Más Costosos
- Tickets con >70 horas: 3 tickets (JIRA-204, JIRA-205, JIRA-203)
- Posibles candidatos para descomposición o refactoring

### 3. Distribución de Trabajo
- Bob: 10 tickets (carga más alta)
- Alice: 9 tickets
- Charlie: 7 tickets
- Distribución razonablemente equilibrada

### 4. Velocidad de Entrega
- 64% de tickets completados
- 14% en progreso activo
- 22% pendientes
- Buen ritmo de trabajo

---

## 🎨 Esquema de Colores

| Estado/Tipo | Color | Hex | Uso |
|------------|-------|-----|------|
| Done | Verde | #5AC189 | Success, completed |
| In Progress | Amarillo | #FCC700 | In progress, pending |
| To Do | Gris | #666666 | Pending, not started |
| Story | Azul | #2893B3 | User stories |
| Bug | Rojo | #E04355 | Critical issues |
| Task | Morado | #A868B7 | Tasks, low priority |

---

## 📚 Arquetura de Carpetas

```
DORA/
├── scripts/
│   └── jira-dashboard/
│       ├── jira_tickets_data.json     (Datos de prueba)
│       └── jira_athena_views.sql       (Vistas SQL)
│
├── docs/
│   └── jira-dashboard/
│       └── README.md                      (Esta guía)
```

---

## 🚀 Pasos para Crear el Dashboard

### 1. Cargar Datos de Prueba
```bash
# Navegar a: http://localhost:8088/superset/upload
# Arrastrar: scripts/jira-dashboard/jira_tickets.csv
# Database: Uploads as CSV
# Table name: jira_tickets
```

### 2. Verificar Dataset
```bash
# Navegar a: http://localhost:8088/superset/data/jira_tickets
# Verificar las columnas: key, summary, status, type, priority, assignee, sprint, cycle_time_hours
```

### 3. Crear Charts Manualmente
#### Chart 1: Total Tickets (Big Number)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Big Number
- Metrics: Count(*)
- Title: "Jira Visual - Total Tickets"

#### Chart 2: Total Hours (Big Number)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Big Number with Trend
- Metrics: SUM(cycle_time_hours)
- Title: "Jira Visual - Total Hours"

#### Chart 3: Status Distribution (Pie Chart)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Pie Chart
- Dimensions: status
- Metrics: Count(*)
- Title: "Jira Visual - Status Distribution"

#### Chart 4: Type Distribution (Pie Chart)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Pie Chart
- Dimensions: type
- Metrics: Count(*)
- Title: "Jira Visual - Type Distribution"

#### Chart 5: Hours per Ticket (Bar Chart - Horizontal)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Bar Chart
- X-axis: ticket_key
- Metrics: cycle_time_hours
- Filters: cycle_time_hours IS NOT NULL
- Order: Descending
- Sort by: cycle_time_hours
- Max: 10 records
- Title: "Jira Visual - Hours per Ticket"

#### Chart 6: Avg Hours by Sprint (Bar Chart - Vertical)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Bar Chart (Time Series - if data is temporal)
- X-axis: sprint
- Metrics: AVG(cycle_time_hours)
- Group by: sprint
- Title: "Jira Visual - Avg Hours by Sprint"

#### Chart 7: Tickets by Assignee (Bar Chart - Vertical)
- Ir a: Charts → + Chart
- Dataset: jira_tickets
- Visualization: Bar Chart
- X-axis: assignee
- Metrics: Count(*)
- Group by: assignee
- Sort by: metric DESC
- Title: "Jira Visual - Tickets by Assignee"

#### Chart 8: Ticket Details (Table)
- Ir a: Columns tab
- Select columns: key, summary, status, type, priority, assignee, sprint, cycle_time_hours
- Sort by: cycle_time_hours DESC
- Limit: 1000 records
- Title: "Jira Visual - Ticket Details"

### 4. Crear Dashboard
1. Ir a: Dashboards → + Dashboard
2. Title: "Jira Visual Dashboard"
3. Slug: `jira-visual-dashboard`
4. Publish: Yes
5. Save

### 5. Agregar Charts al Dashboard
1. Add chart: "Jira Visual - Total Tickets"
2. Add chart: "Jira - Total Hours"
3. Add chart: "Jira Visual - Status Distribution"
4. Add chart: "Jira Visual - Type Distribution"
5. Add chart: "Jira Visual - Hours per Ticket"
6. Add chart: "Jira Visual - Avg Hours by Sprint"
7. Add chart: "Jira - Tickets by Assignee"
8. Add chart: "Jira Visual - Ticket Details"

### 6. Agregar Filtro Nativo de Sprint
1. Click on the dashboard settings (gear icon)
2. Go to Native Filters → Add Native Filter
3. Filter Type: Filter Box / Select
4. Target: jira_tickets dataset
5. Column: sprint
6. Filter name: "Sprint Filter"
7. Apply to: All charts
8. Save filter

---

## 🎯 Insights que Verás

### 1. Eficiencia por Sprint
- Sprint 1: 4 tickets completados, 226.0h totales, 56.5h promedio
- Sprint 2: 5 tickets completados, 321.0h totales, 64.2h promedio
- Sprint 3: 5 tickets, 0 completados (en progreso)

### 2. Tickets Más Costosos
- JIRA-204 (Performance optimization): 81.0h
- JIRA-205 (Mobile responsive): 79.0h
- JIRA-203 (Add dark mode): 77.0h
- Estos tickets requieren atención especial

### 3. Distribución de Trabajo
- Bob: 10 tickets (carga más alta)
- Alice: 9 tickets
- Charlie: 7 tickets
- Distribución razonablemente equilibrada

### 4. Velocidad de Entrega
- 64% de tickets completados
- 14% en progreso activo
- 22% pendientes
- Buen ritmo de trabajo

### 5. Distribución por Tipo
- Story: 10 tickets (71%)
- Bug: 3 tickets (21%)
- Task: 1 ticket (8%)

---

## 🎨 Visualización de Datos

### Gráficos Circulares (Pie Charts)
- **Status Distribution**: Muestra 3 segmentos coloreados
- **Type Distribution**: Muestra 3 segmentos coloreados
- Los gráficos son interactivos con los filtros nativos

### Gráficos de Barras (Bar Charts)
- **Hours per Ticket**: Muestra los 10 tickets más costosos
- **Avg Hours by Sprint**: Compara 3 sprints
- **Tickets by Assignee**: Muestra carga por persona

### Tabla Detallada
- Muestra todos los 14 tickets con todas las columnas
- Ordenado por cycle_time_hours (de mayor a menor)
- Permite filtrar por sprint, assignee, status, etc.

### Big Numbers
- Total Tickets: 14
- Total Hours: 492.0
- Avg per Sprint: 56.5h (Sprint 1), 64.2h (Sprint 2)
- Filtros nativos de sprint aplican a todos los charts

---

## 📚 Referencias

- Superset Charts Documentation: https://superset.apache.org/docs/api/
- Superset Explore View Guide: https://superset.apache.org/docs/api/v1/
- Chart Types Reference: https://superset.apache.org/docs/api/v1/

---

**Versión**: v1.0  
**Fecha**: 2026-02-05  
**Estado**: ✅ Concepto listo para implementar  
**URL**: http://localhost:8088/superset/dashboard/jira-visual-dashboard/
