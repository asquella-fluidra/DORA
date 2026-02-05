# Jira Visual Dashboard - Manual Creation Guide

## Overview

This guide walks you through manually creating the **Jira Visual Dashboard** in Superset using the fake Jira ticket data.

**Dashboard URL**: `http://localhost:8088/superset/dashboard/jira-visual-dashboard/`

**Dataset**: CSV file with 14 fake Jira tickets (3 sprints)

**Charts**: 8 visualizations (2 big numbers, 2 pie charts, 3 bar charts, 1 table)

---

## Prerequisites

- Superset is running at `http://localhost:8088`
- You are logged in as admin
- CSV file is ready: `scripts/jira-dashboard/jira_tickets.csv`

---

## Step 1: Upload CSV to Superset

### 1.1 Navigate to Upload Page

1. Open your browser and go to: `http://localhost:8088`
2. Login with admin credentials
3. Click **Settings** (gear icon in top right) → **Import Dashboards & Datasets**
4. OR click **Data** → **Upload a CSV**

### 1.2 Upload the CSV File

1. Click **Choose File** or drag and drop the file
2. Select: `scripts/jira-dashboard/jira_tickets.csv`
3. **File Settings**:
   - **Name**: `jira_tickets`
   - **Database**: `examples` (or leave default)
4. Click **Next**

### 1.3 Configure the Dataset

1. **Column Settings** (Superset should auto-detect):
   - `key` - VARCHAR (Ticket Key)
   - `summary` - VARCHAR (Ticket Summary)
   - `status` - VARCHAR (Done/In Progress/To Do)
   - `type` - VARCHAR (Story/Bug/Task)
   - `priority` - VARCHAR (High/Medium/Low/Critical)
   - `assignee` - VARCHAR (Alice/Bob/Charlie)
   - `sprint` - VARCHAR (Sprint 1/Sprint 2/Sprint 3)
   - `created_at` - DATETIME (ISO 8601)
   - `updated_at` - DATETIME (ISO 8601)
   - `resolved_at` - DATETIME (ISO 8601)
   - `cycle_time_hours` - FLOAT (Hours)

2. Click **Save**

3. Verify the dataset appears in **Data** → **Datasets**
   - Name: `jira_tickets`
   - Type: CSV (file)

---

## Step 2: Create Charts

### Chart 1: Total Tickets (Big Number)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Big Number** (or **Big Number with Trendline**)
4. **Configuration**:
   - **Metric**: `COUNT(*)`
   - **Label**: `Total Tickets`
5. Click **Save**
6. **Chart Name**: `Total Tickets`
7. **Save to Dashboard**: Select "New Dashboard" → `Jira Visual Dashboard`
8. **Dashboard Slug**: `jira-visual-dashboard`
9. Click **Save**

**Expected Result**: Big number showing **14**

---

### Chart 2: Total Cycle Time (Big Number)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Big Number**
4. **Configuration**:
   - **Metric**: `SUM(cycle_time_hours)`
   - **Label**: `Total Cycle Time (Hours)`
   - **Format**: Number with decimals: `0.0`
5. Click **Save**
6. **Chart Name**: `Total Cycle Time (Hours)`
7. **Save to Dashboard**: Select existing dashboard `Jira Visual Dashboard`
8. Click **Save**

**Expected Result**: Big number showing **492.0**

---

### Chart 3: Status Distribution (Pie Chart)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Pie Chart**
4. **Configuration**:
   - **Dimension**: `status`
   - **Metric**: `COUNT(*)`
5. **Time Column**: `created_at` (optional)
6. Click **Save**
7. **Chart Name**: `Status Distribution`
8. **Save to Dashboard**: Select `Jira Visual Dashboard`
9. Click **Save**

**Expected Result**: Pie chart with 3 slices:
- Done: 9 tickets (64%)
- In Progress: 2 tickets (14%)
- To Do: 3 tickets (22%)

---

### Chart 4: Type Distribution (Pie Chart)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Pie Chart**
4. **Configuration**:
   - **Dimension**: `type`
   - **Metric**: `COUNT(*)`
5. Click **Save**
6. **Chart Name**: `Type Distribution`
7. **Save to Dashboard**: Select `Jira Visual Dashboard`
8. Click **Save**

**Expected Result**: Pie chart with 3 slices:
- Story: 10 tickets (71%)
- Bug: 3 tickets (21%)
- Task: 1 ticket (8%)

---

### Chart 5: Hours per Ticket (Bar Chart)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Bar Chart**
4. **Configuration**:
   - **Dimension**: `key` (Ticket Key)
   - **Metric**: `SUM(cycle_time_hours)`
   - **Sort By**: Metric descending
   - **Row Limit**: 10
5. Click **Save**
6. **Chart Name**: `Hours per Ticket (Top 10)`
7. **Save to Dashboard**: Select `Jira Visual Dashboard`
8. Click **Save**

**Expected Result**: Bar chart showing top 10 tickets by hours:
- JIRA-204: 81.0h
- JIRA-205: 79.0h
- JIRA-203: 77.0h
- JIRA-101: 64.0h
- JIRA-104: 57.0h
- JIRA-201: 56.0h
- JIRA-102: 54.0h
- JIRA-103: 51.0h
- JIRA-202: 28.0h
- JIRA-301-305: 0.0h (in progress/to do)

---

### Chart 6: Avg Hours by Sprint (Bar Chart)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Bar Chart**
4. **Configuration**:
   - **Dimension**: `sprint`
   - **Metric**: `AVG(cycle_time_hours)`
   - **Label**: `Avg Cycle Time (Hours)`
5. Click **Save**
6. **Chart Name**: `Avg Hours by Sprint`
7. **Save to Dashboard**: Select `Jira Visual Dashboard`
8. Click **Save**

**Expected Result**: Bar chart showing:
- Sprint 1: 56.5h (226.0h / 4 tickets)
- Sprint 2: 64.2h (321.0h / 5 tickets)
- Sprint 3: 0.0h (in progress)

---

### Chart 7: Tickets by Assignee (Bar Chart)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Bar Chart**
4. **Configuration**:
   - **Dimension**: `assignee`
   - **Metric**: `COUNT(*)`
5. Click **Save**
6. **Chart Name**: `Tickets by Assignee`
7. **Save to Dashboard**: Select `Jira Visual Dashboard`
8. Click **Save**

**Expected Result**: Bar chart showing:
- Alice: 5 tickets
- Bob: 5 tickets
- Charlie: 4 tickets

---

### Chart 8: Ticket Details (Table)

1. Go to **Charts** → **+ Chart**
2. **Dataset**: `jira_tickets`
3. **Chart Type**: **Table**
4. **Configuration**:
   - **Columns**: Select all columns:
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
   - **Row Limit**: 100
5. Click **Save**
6. **Chart Name**: `Ticket Details`
7. **Save to Dashboard**: Select `Jira Visual Dashboard`
8. Click **Save**

**Expected Result**: Table showing all 14 tickets with full details

---

## Step 3: Add Native Filter (Sprint Filter)

1. Open the dashboard: `http://localhost:8088/superset/dashboard/jira-visual-dashboard/`
2. Click **Edit Dashboard** (pencil icon)
3. Click **+ Filter** (top right)
4. **Filter Type**: **Native Filters**
5. **Filter Name**: `Sprint Filter`
6. **Filter Control Type**: **Dropdown** (Filter Select)
7. **Dataset**: `jira_tickets`
8. **Column**: `sprint`
9. **Default Value**: (leave empty for "All")
10. Click **Add**

11. **Apply to Charts**: Select all 8 charts
12. Click **Save**

**Test the Filter**:
- Select "Sprint 1" → Should show only 4 tickets
- Select "Sprint 2" → Should show only 5 tickets
- Select "Sprint 3" → Should show only 5 tickets (in progress/to do)

---

## Step 4: Arrange Dashboard Layout

1. Click **Edit Dashboard**
2. Drag and drop charts to arrange:
   - **Row 1**: Total Tickets (Big Number) | Total Cycle Time (Big Number)
   - **Row 2**: Status Distribution (Pie) | Type Distribution (Pie)
   - **Row 3**: Hours per Ticket (Bar)
   - **Row 4**: Avg Hours by Sprint (Bar)
   - **Row 5**: Tickets by Assignee (Bar)
   - **Row 6**: Ticket Details (Table) - full width
   - **Top**: Sprint Filter (native filter)

3. Adjust chart sizes:
   - Big Numbers: 1x1 or 2x1
   - Pie Charts: 2x2
   - Bar Charts: 4x3 or 6x3
   - Table: 12x6 (full width)

4. Click **Save Changes**

---

## Step 5: Verify Dashboard

### 5.1 Check Dashboard URL

Open: `http://localhost:8088/superset/dashboard/jira-visual-dashboard/`

### 5.2 Verify Charts Render

1. **Total Tickets**: Should show **14**
2. **Total Cycle Time**: Should show **492.0 hours**
3. **Status Distribution**: 3 pie slices (Done: 9, In Progress: 2, To Do: 3)
4. **Type Distribution**: 3 pie slices (Story: 10, Bug: 3, Task: 1)
5. **Hours per Ticket**: Bar chart with top 10 tickets
6. **Avg Hours by Sprint**: 3 bars (Sprint 1: 56.5h, Sprint 2: 64.2h, Sprint 3: 0.0h)
7. **Tickets by Assignee**: 3 bars (Alice: 5, Bob: 5, Charlie: 4)
8. **Ticket Details**: Table with 14 rows

### 5.3 Test Filter

1. Click **Sprint Filter** dropdown
2. Select "Sprint 1"
3. Verify:
   - Total Tickets: **4**
   - Total Cycle Time: **226.0h**
   - Status: All Done (4)
   - Hours per Ticket: 4 tickets
   - Avg Hours by Sprint: 56.5h

4. Clear filter (select "All")
5. Verify all 14 tickets appear again

---

## Troubleshooting

### Issue: CSV upload fails

**Solution**:
- Verify CSV file format (comma-separated, no extra spaces)
- Check file encoding (UTF-8)
- Ensure column names match exactly

### Issue: Charts show "No data"

**Solution**:
- Verify dataset has data (Data → Datasets → jira_tickets → Explore)
- Check column mappings
- Verify metrics and dimensions are correct

### Issue: Filter doesn't work

**Solution**:
- Ensure "Native Filters" is enabled
- Verify filter is applied to all charts
- Check column name matches exactly (`sprint`, not `Sprint`)

### Issue: Dashboard not accessible at URL

**Solution**:
- Verify dashboard slug is correct: `jira-visual-dashboard`
- Check dashboard is published (not draft)
- Try accessing via Dashboards menu instead of direct URL

---

## Data Summary

**Total Tickets**: 14

**Sprints**:
- Sprint 1: 4 tickets (226.0h total, 56.5h avg)
- Sprint 2: 5 tickets (321.0h total, 64.2h avg)
- Sprint 3: 5 tickets (in progress, 0.0h)

**Status**:
- Done: 9 tickets (64%)
- In Progress: 2 tickets (14%)
- To Do: 3 tickets (22%)

**Type**:
- Story: 10 tickets (71%)
- Bug: 3 tickets (21%)
- Task: 1 ticket (8%)

**Assignees**:
- Alice: 5 tickets
- Bob: 5 tickets
- Charlie: 4 tickets

**Total Cycle Time**: 492.0 hours

---

## Next Steps

Once the dashboard is verified:

1. **Take Screenshots**: Capture the dashboard with filter applied to different sprints
2. **Share with Team**: Share the dashboard URL: `http://localhost:8088/superset/dashboard/jira-visual-dashboard/`
3. **Iterate**: Add more charts or filters as needed
4. **Export Data**: Use the table chart to export filtered data to CSV

---

## Files Reference

- **CSV Data**: `scripts/jira-dashboard/jira_tickets.csv`
- **JSON Source**: `scripts/jira-dashboard/jira_tickets_data.json`
- **Dashboard Design**: `docs/jira-dashboard/README.md`
- **Manual Guide**: `docs/jira-dashboard/MANUAL_CREATION_GUIDE.md` (this file)

---

**Dashboard URL**: `http://localhost:8088/superset/dashboard/jira-visual-dashboard/`

**Created**: February 2026

**Last Updated**: February 2026