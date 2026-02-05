#!/usr/bin/env python3
"""
Create Jira ROI Dashboard programmatically
Script is idempotent - will recreate if exists
"""

import json

def main():
    print("=" * 60)
    print("Jira ROI Dashboard Provisioning Script")
    print("=" * 60)

    # Initialize app first before importing models
    from superset import create_app
    app = create_app()

    with app.app_context():
        from superset import db
        from superset.connectors.sqla.models import SqlaTable
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice

        # Get dataset
        print("\n[1/5] Getting dataset ID 22...")
        dataset = db.session.query(SqlaTable).get(22)
        if not dataset:
            print("ERROR: Dataset 22 not found!")
            return

        print(f"✓ Dataset found: {dataset.table_name} ({dataset.schema})")
        print(f"  Columns: {len(dataset.columns)} columns")

        # Get viz types available
        print("\n[2/5] Checking available viz types...")
        try:
            from superset.models.slice import Slice
            # Try to get any slice to see what viz_types are available
            test_slice = db.session.query(Slice).first()
            if test_slice:
                print(f"  Sample viz_type: {test_slice.viz_type}")
        except Exception as e:
            print(f"  Note: Could not check viz types: {e}")

        # Define charts
        charts_config = [
            {
                "name": "ROI - Tickets Done",
                "viz_type": "big_number",
                "params": json.dumps({
                    "datasource": f"{dataset.id}__table",
                    "viz_type": "big_number",
                    "metric": "tickets_done",
                    "adhoc_filters": [{
                        "clause": "WHERE",
                        "comparator": "2026-02-04",
                        "expressionType": "SIMPLE",
                        "filterOptionName": "filter_ingestion_date",
                        "isExtra": False,
                        "isNew": False,
                        "operator": "==",
                        "sqlExpression": None,
                        "subject": "ingestion_date"
                    }],
                    "time_range": "No filter",
                    "row_limit": 1000
                })
            },
            {
                "name": "ROI - WIP",
                "viz_type": "big_number",
                "params": json.dumps({
                    "datasource": f"{dataset.id}__table",
                    "viz_type": "big_number",
                    "metric": "wip",
                    "adhoc_filters": [{
                        "clause": "WHERE",
                        "comparator": "2026-02-04",
                        "expressionType": "SIMPLE",
                        "filterOptionName": "filter_ingestion_date",
                        "isExtra": False,
                        "isNew": False,
                        "operator": "==",
                        "sqlExpression": None,
                        "subject": "ingestion_date"
                    }],
                    "time_range": "No filter",
                    "row_limit": 1000
                })
            },
            {
                "name": "ROI - Avg Cycle Time Hours",
                "viz_type": "big_number",
                "params": json.dumps({
                    "datasource": f"{dataset.id}__table",
                    "viz_type": "big_number",
                    "metric": "avg_cycle_time_hours",
                    "adhoc_filters": [{
                        "clause": "WHERE",
                        "comparator": "2026-02-04",
                        "expressionType": "SIMPLE",
                        "filterOptionName": "filter_ingestion_date",
                        "isExtra": False,
                        "isNew": False,
                        "operator": "==",
                        "sqlExpression": None,
                        "subject": "ingestion_date"
                    }],
                    "time_range": "No filter",
                    "row_limit": 1000
                })
            },
            {
                "name": "ROI - KPI Snapshot",
                "viz_type": "table",
                "params": json.dumps({
                    "datasource": f"{dataset.id}__table",
                    "viz_type": "table",
                    "groupby": [
                        "tickets_total", "tickets_done", "tickets_in_progress",
                        "tickets_todo", "wip", "avg_cycle_time_hours",
                        "produced_at", "ingestion_date"
                    ],
                    "adhoc_filters": [{
                        "clause": "WHERE",
                        "comparator": "2026-02-04",
                        "expressionType": "SIMPLE",
                        "filterOptionName": "filter_ingestion_date",
                        "isExtra": False,
                        "isNew": False,
                        "operator": "==",
                        "sqlExpression": None,
                        "subject": "ingestion_date"
                    }],
                    "row_limit": 50
                })
            },
            {
                "name": "ROI - Trend (All Dates)",
                "viz_type": "line",
                "params": json.dumps({
                    "datasource": f"{dataset.id}__table",
                    "viz_type": "line",
                    "x_axis": "ingestion_date",
                    "metrics": ["tickets_done", "wip", "avg_cycle_time_hours"],
                    "groupby": [],
                    "time_range": "No filter",
                    "row_limit": 10000
                })
            }
        ]

        # Create/recreate charts
        print("\n[3/5] Creating charts...")
        created_slices = []

        for i, chart_config in enumerate(charts_config, 1):
            chart_name = chart_config["name"]
            viz_type = chart_config["viz_type"]
            params = chart_config["params"]

            print(f"\n  Chart {i}/5: {chart_name}")
            print(f"    Type: {viz_type}")

            # Check if chart exists
            existing_slice = db.session.query(Slice).filter(
                Slice.slice_name == chart_name
            ).first()

            if existing_slice:
                print(f"    - Chart exists (ID {existing_slice.id}), deleting...")
                db.session.delete(existing_slice)
                db.session.commit()

            # Create new slice
            try:
                slice_obj = Slice(
                    slice_name=chart_name,
                    viz_type=viz_type,
                    datasource_type="table",
                    datasource_id=dataset.id,
                    params=params,
                    description=f"Auto-generated chart for Jira ROI dashboard"
                )
                db.session.add(slice_obj)
                db.session.commit()
                print(f"    ✓ Chart created (ID {slice_obj.id})")
                created_slices.append(slice_obj)
            except Exception as e:
                print(f"    ✗ Failed to create: {e}")
                db.session.rollback()
                import traceback
                traceback.print_exc()

        if len(created_slices) < 5:
            print(f"\nWARNING: Only {len(created_slices)}/5 charts created successfully")
            print("Continuing with available charts...")

        # Create/recreate dashboard
        print("\n[4/5] Creating dashboard...")
        dashboard_slug = "jira-roi-mvp-athena"
        dashboard_title = "Jira ROI MVP (Athena)"

        # Check if dashboard exists
        existing_dashboard = db.session.query(Dashboard).filter(
            Dashboard.slug == dashboard_slug
        ).first()

        if existing_dashboard:
            print(f"  - Dashboard exists (ID {existing_dashboard.id}), recreating...")
            # Clear slices
            existing_dashboard.slices.clear()
            db.session.commit()
            # Delete dashboard
            db.session.delete(existing_dashboard)
            db.session.commit()

        # Create new dashboard
        dashboard = Dashboard(
            dashboard_title=dashboard_title,
            slug=dashboard_slug,
            description="Jira ROI Dashboard showing tickets done, cycle time, and WIP metrics",
            published=True,
            position_json="{}",
            css="",
            json_metadata=json.dumps({
                "chart_configuration": {},
                "color_scheme": "supersetColors",
                "native_filter_configuration": []
            })
        )
        db.session.add(dashboard)
        db.session.commit()
        print(f"  ✓ Dashboard created (ID {dashboard.id})")

        # Add slices to dashboard
        print("\n[5/5] Adding charts to dashboard...")
        for slice_obj in created_slices:
            dashboard.slices.append(slice_obj)
            print(f"  - Added: {slice_obj.slice_name}")

        db.session.commit()
        print(f"  ✓ Added {len(created_slices)} charts to dashboard")

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Dashboard ID: {dashboard.id}")
        print(f"Dashboard Slug: {dashboard.slug}")
        print(f"Dashboard URL: http://localhost:8088/superset/dashboard/{dashboard.slug}/")
        print(f"\nCharts ({len(created_slices)}):")
        for i, slice_obj in enumerate(created_slices, 1):
            print(f"  {i}. {slice_obj.slice_name} (ID: {slice_obj.id}, Type: {slice_obj.viz_type})")
        print("\n" + "=" * 60)
        print("SUCCESS: Dashboard provisioning complete!")
        print("=" * 60)

if __name__ == "__main__":
    main()
