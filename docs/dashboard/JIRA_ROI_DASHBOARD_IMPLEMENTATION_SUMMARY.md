# Jira ROI Dashboard - Implementation Summary

## Date: February 5, 2026

## Current Status

### ✅ Completed Successfully

#### 1. Athena Connection Verified
- Connection to `dora_etl_dev` database working
- Database ID: 2
- Engine: AWS Athena

#### 2. Views Created in Athena
Three views were successfully created in the `dora_etl_dev` schema:

**v_jira_status_snapshot**
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
ORDER BY ingestion_date DESC;
```

**v_jira_cycle_time**
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
ORDER BY ingestion_date DESC, cycle_time_hours DESC;
```

**v_jira_roi_proxy**
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
FROM dora_etl_dev.v_jira_status_snapshot;
```

#### 3. Dataset Created in Superset
- Dataset ID: 22
- Name: `dora_etl_dev.v_jira_status_snapshot`
- Type: Table
- Database: Athena - dora_etl_dev
- Schema: dora_etl_dev
- Columns:
  - ingestion_date (STRING)
  - tickets_total (INTEGER)
  - tickets_done (INTEGER)
  - tickets_in_progress (INTEGER)
  - tickets_todo (INTEGER)
  - wip (INTEGER)
  - avg_cycle_time_hours (FLOAT)
  - produced_at (STRING)

#### 4. Data Verified
Query results for `ingestion_date = '2026-02-04'`:
- tickets_done: 1
- tickets_total: 3
- tickets_in_progress: 1
- tickets_todo: 1
- wip: 1
- avg_cycle_time_hours: 125.5

### ⚠️ Issues Encountered

#### 1. Browser UI Issues
- Chart creation UI becomes unresponsive after loading
- Multiple modal dialogs interfere with navigation
- SQL Lab queries parse with errors despite valid SQL syntax

#### 2. API CSRF Protection
All POST requests to Superset API require CSRF token, which prevents programmatic creation of:
- Charts
- Dashboards
- Saved queries

#### 3. Dataset Table Selection Issue
When creating additional datasets via UI:
- Table dropdown only shows `v_dora_current` and `v_dora_trend`
- The 3 new views (v_jira_cycle_time, v_jira_status_snapshot, v_jira_roi_proxy) are not visible
- However, dataset for v_jira_status_snapshot was successfully created (ID: 22)

## What Needs to Be Done

### Manual Steps Required (via Superset UI)

#### Step 1: Create Additional Datasets
For each of the remaining views, create a dataset:
1. Navigate to Data → Datasets
2. Click + Dataset
3. Select database: Athena - dora_etl_dev
4. For each view (workaround if not in dropdown):
   - Use SQL Lab to verify view exists: `SHOW TABLES IN dora_etl_dev`
   - Use API or CLI to create dataset programmatically (see alternative approaches below)

#### Step 2: Create Charts
Create 6 charts for the dashboard:

**Chart 1: Tickets Done Trend**
- Dataset: v_jira_status_snapshot
- Type: Line Chart (Time Series)
- X-axis: ingestion_date
- Y-axis: tickets_done
- Title: "Tickets Done Over Time"

**Chart 2: Cycle Time Distribution**
- Dataset: v_jira_cycle_time
- Type: Bar Chart
- X-axis: issue_key or cycle_speed_category
- Y-axis: cycle_time_hours
- Title: "Cycle Time Distribution"

**Chart 3: WIP Trend**
- Dataset: v_jira_status_snapshot
- Type: Line Chart (Time Series)
- X-axis: ingestion_date
- Y-axis: wip
- Title: "Work in Progress Over Time"

**Chart 4: Status Breakdown**
- Dataset: v_jira_status_snapshot
- Type: Stacked Bar Chart
- X-axis: ingestion_date
- Series: tickets_done, tickets_in_progress, tickets_todo
- Title: "Ticket Status Breakdown"

**Chart 5: Completion Rate**
- Dataset: v_jira_roi_proxy
- Type: Line Chart (Time Series)
- X-axis: ingestion_date
- Y-axis: completion_rate_pct
- Title: "Completion Rate Trend (%)"

**Chart 6: Average Cycle Time**
- Dataset: v_jira_status_snapshot
- Type: Big Number or Gauge
- Metric: avg_cycle_time_hours
- Title: "Avg Cycle Time (Hours)"

#### Step 3: Create Dashboard
1. Navigate to Dashboards → + Dashboard
2. Title: "Jira ROI MVP (Athena)"
3. Add all 6 charts
4. Add native filter for `ingestion_date`:
   - Filter type: Time Column / Filter Box
   - Column: ingestion_date
   - Label: "Ingestion Date"

### Alternative Approaches

#### Approach A: Use Superset CLI
Superset provides CLI commands that might bypass CSRF:
```bash
# Export dashboard template
superset export_dashboards -f dashboard.json

# Import dashboard
superset import_dashboards -f dashboard.json
```

#### Approach B: Use Python SDK
Install and use superset-api-client:
```python
from supersetapi.client import SupersetClient

client = SupersetClient(
    host="http://localhost:8088",
    username="admin",
    password="admin"
)

# Create chart
client.charts.create_chart({
    "datasource_id": 22,
    "slice_name": "Tickets Done Over Time",
    # ... other params
})
```

#### Approach C: Disable CSRF Temporarily (Dev Only)
In `superset_config.py`:
```python
WTF_CSRF_ENABLED = False  # Only for development!
```
Then restart Superset and create charts via API.

#### Approach D: Use Database Import/Export
1. Create charts/dashboards in a working environment
2. Export database via `superset db export`
3. Import in current environment

## Data Queries for Manual Creation

### SQL for Chart Data Queries
```sql
-- Tickets Done Trend
SELECT ingestion_date, tickets_done
FROM dora_etl_dev.v_jira_status_snapshot
ORDER BY ingestion_date ASC;

-- Cycle Time Distribution
SELECT issue_key, cycle_time_hours, issue_type, priority
FROM dora_etl_dev.v_jira_cycle_time
ORDER BY cycle_time_hours DESC
LIMIT 20;

-- WIP Trend
SELECT ingestion_date, wip
FROM dora_etl_dev.v_jira_status_snapshot
ORDER BY ingestion_date ASC;

-- Status Breakdown
SELECT ingestion_date, tickets_done, tickets_in_progress, tickets_todo
FROM dora_etl_dev.v_jira_status_snapshot
ORDER BY ingestion_date ASC;

-- Completion Rate
SELECT ingestion_date, completion_rate_pct
FROM dora_etl_dev.v_jira_roi_proxy
ORDER BY ingestion_date ASC;

-- Average Cycle Time (Big Number)
SELECT AVG(avg_cycle_time_hours) as avg_cycle_time
FROM dora_etl_dev.v_jira_status_snapshot;
```

## Summary

### What We Have
- ✅ Working Athena connection to dora_etl_dev
- ✅ 3 views created in Athena (v_jira_cycle_time, v_jira_status_snapshot, v_jira_roi_proxy)
- ✅ 1 dataset created in Superset (v_jira_status_snapshot, ID: 22)
- ✅ Data verified and accessible via API
- ✅ SQL queries documented for all 6 charts

### What's Missing
- ⚠️ 2 additional datasets (v_jira_cycle_time, v_jira_roi_proxy)
- ⚠️ 6 charts (Tickets Done, Cycle Time, WIP, Status Breakdown, Completion Rate, Avg Cycle Time)
- ⚠️ 1 dashboard (Jira ROI MVP)

### Recommendation
Given the persistent UI and API CSRF issues, the recommended path forward is:
1. Try Alternative Approach C (temporarily disable CSRF for dev) to complete the setup
2. OR use Alternative Approach B (Python SDK) which may handle CSRF properly
3. Once dashboard is created, re-enable CSRF protection

## Contact
For questions or issues, refer to:
- Superset documentation: https://superset.apache.org/docs/api/
- Athena query logs in AWS CloudWatch
- Superset logs: `docker logs superset`
