# Jira ROI Dashboard - Next Steps

## Quick Start Guide

### Option 1: Try Python SDK (Recommended for Production)
```bash
# Install superset-api-client
pip install apache-superset

# Use Python script to create dashboard
# See script below
```

### Option 2: Temporarily Disable CSRF (Dev Only)
```bash
# Stop Superset
docker-compose down

# Edit superset_config.py
# Add: WTF_CSRF_ENABLED = False

# Start Superset
docker-compose up -d

# Use API to create dashboard (no CSRF required)
# See API commands below

# Re-enable CSRF after completion
# Remove: WTF_CSRF_ENABLED = False
# docker-compose restart
```

### Option 3: Manual UI Creation (Most Reliable)
Follow the steps in the Implementation Summary document, working around UI issues by:
- Using browser refresh when UI freezes
- Closing modal dialogs manually
- Creating one chart at a time and saving before proceeding

## Python SDK Script

```python
#!/usr/bin/env python3
"""
Create Jira ROI Dashboard programmatically
Run this with: python3 create_jira_dashboard.py
"""

from superset import db
from superset.connectors.sqla.models import SqlaTable
from superset.models.core import Dashboard, Slice
from superset.views.base import api
import requests

# Configuration
SUPERSET_URL = "http://localhost:8088"
USERNAME = "admin"
PASSWORD = "admin"

# Login
session = requests.Session()
login_response = session.post(
    f"{SUPERSET_URL}/api/v1/security/login",
    json={"username": USERNAME, "password": PASSWORD, "provider": "db"}
)
token = login_response.json()["access_token"]
session.headers.update({"Authorization": f"Bearer {token}"})

# Create additional datasets
views = [
    {"name": "v_jira_cycle_time", "description": "Cycle time analysis"},
    {"name": "v_jira_roi_proxy", "description": "ROI calculation proxy"}
]

for view in views:
    response = session.post(
        f"{SUPERSET_URL}/api/v1/dataset/",
        json={
            "database": 2,
            "schema": "dora_etl_dev",
            "table_name": view["name"],
            "description": view["description"]
        }
    )
    print(f"Created dataset {view['name']}: {response.status_code}")

# Create dashboard
dashboard_response = session.post(
    f"{SUPERSET_URL}/api/v1/dashboard/",
    json={
        "dashboard_title": "Jira ROI MVP (Athena)",
        "owners": [1],
        "slug": "jira-roi-mvp-athena",
        "description": "Jira ROI Dashboard"
    }
)
dashboard_id = dashboard_response.json()["id"]
print(f"Created dashboard: {dashboard_id}")

print("Next: Create charts and add to dashboard via UI or additional script")
```

## API Commands (If CSRF Disabled)

### Create Datasets
```bash
TOKEN="your-access-token"

# v_jira_cycle_time
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "database": 2,
    "schema": "dora_etl_dev",
    "table_name": "v_jira_cycle_time",
    "description": "Cycle time analysis"
  }' \
  http://localhost:8088/api/v1/dataset/

# v_jira_roi_proxy
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "database": 2,
    "schema": "dora_etl_dev",
    "table_name": "v_jira_roi_proxy",
    "description": "ROI calculation proxy"
  }' \
  http://localhost:8088/api/v1/dataset/
```

### Get Current Dataset IDs
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8088/api/v1/dataset/ | \
  python3 -m json.tool | grep -E '(id|table_name)'
```

### Create Dashboard
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard_title": "Jira ROI MVP (Athena)",
    "owners": [1],
    "slug": "jira-roi-mvp-athena",
    "description": "Jira ROI Dashboard"
  }' \
  http://localhost:8088/api/v1/dashboard/
```

## Verification Steps

### 1. Verify Views in Athena
```bash
aws athena get-query-execution \
  --query-execution-id <query-id> \
  --region us-west-1

# Or via Superset SQL Lab:
SHOW TABLES IN dora_etl_dev;
-- Should show: v_jira_cycle_time, v_jira_status_snapshot, v_jira_roi_proxy
```

### 2. Verify Datasets in Superset
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8088/api/v1/dataset/ | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print([d['table_name'] for d in data['result'] if d['schema']=='dora_etl_dev'])"
```

### 3. Verify Data
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasource": {"id": 22, "type": "table"},
    "queries": [{
      "viz_type": "table",
      "row_limit": 100
    }]
  }' \
  http://localhost:8088/api/v1/chart/data
```

## Quick Test Dashboard

If all else fails, create a minimal dashboard with 1 chart:

1. Navigate to http://localhost:8088/explore/?datasource_type=table&datasource_id=22
2. Create one simple chart (e.g., Table view showing all data)
3. Save as "Jira ROI Test"
4. Create dashboard "Jira MVP (Test)"
5. Add the chart
6. Verify data displays correctly

This at least proves end-to-end connectivity and data flow.

## Troubleshooting

### CSRF Token Issues
```
Error: "The CSRF token is missing."
Solution: Use Python SDK or temporarily disable CSRF (Option 2)
```

### Dataset Not Found in Dropdown
```
Solution:
1. Verify view exists in Athena: SHOW TABLES IN dora_etl_dev
2. Create dataset via API using view name directly
3. Check Superset logs: docker logs superset
```

### Chart UI Freezes
```
Solution:
1. Refresh browser page
2. Clear browser cache
3. Try Incognito/Private browsing mode
4. Use API instead of UI
```

### Data Not Showing
```
Solution:
1. Verify data in Athena directly
2. Check dataset permissions
3. Verify time range filters
4. Check Superset query logs in Settings → Query History
```

## Success Criteria

Dashboard is complete when:
- [ ] 3 datasets exist (v_jira_cycle_time, v_jira_status_snapshot, v_jira_roi_proxy)
- [ ] 6 charts created (Tickets Done, Cycle Time, WIP, Status Breakdown, Completion Rate, Avg Cycle Time)
- [ ] 1 dashboard exists (Jira ROI MVP (Athena))
- [ ] Dashboard shows data for 2026-02-04
- [ ] Native filter works for ingestion_date
- [ ] All charts render without errors
