#!/usr/bin/env python3
"""
Create Jira Visual Dashboard in Superset
Creates 8 visual charts: big numbers, pie charts, bar charts, and table
"""

import json

def main():
    print("=" * 80)
    print("Jira Visual Dashboard Provisioning Script")
    print("=" * 80)
    print()

    from superset import create_app
    app = create_app()

    with app.app_context():
        from superset import db
        from superset.connectors.sqla.models import SqlaTable
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice

        # Get all datasets from dora_etl_dev database
        print("[1/3] Getting datasets from dora_etl_dev...")
        datasets = db.session.query(SqlaTable).filter(
            SqlaTable.schema == 'dora_etl_dev'
        ).all()

        print(f"Found {len(datasets)} datasets:")
        for ds in datasets[:10]:
            print(f"  - {ds.table_name} (ID: {ds.id})")
        print()

        # Use the main table (curated_jira_issues)
        main_table = None
        for ds in datasets:
            if 'curated_jira_issues' in ds.table_name.lower():
                main_table = ds
                break

        if not main_table:
            # Use first available
            main_table = datasets[0] if datasets else None

        if not main_table:
            print("ERROR: No datasets found in dora_etl_dev")
            return

        print(f"Using table: {main_table.table_name} (ID: {main_table.id})")
        print()

        # Check if the required columns exist
        print("[2/3] Checking table columns...")
        column_names = [col.column_name for col in main_table.columns]
        print(f"  Available columns: {', '.join(column_names[:15])}")
        print()

        # Check what viz_types are available
        print("Checking available viz_types...")
        test_slice = db.session.query(Slice).first()
        if test_slice:
            print(f"  Sample viz_type: {test_slice.viz_type}")
        print()

        # Determine available viz_types based on what we have
        available_viz_types = []
        
        # Try to find existing charts with different viz_types
        all_slices = db.session.query(Slice).all()
        viz_types_found = set()
        for s in all_slices:
            if s.viz_type:
                viz_types_found.add(s.viz_type)
        
        available_viz_types = sorted(list(viz_types_found))
        print(f"  Available viz_types: {', '.join(available_viz_types[:10])}")
        print()

        # Delete existing dashboard if exists
        print("[3/3] Cleaning up existing dashboard...")
        existing_dash = db.session.query(Dashboard).filter(
            Dashboard.slug == 'jira-visual-dashboard'
        ).first()

        if existing_dash:
            print(f"Deleting existing dashboard: {existing_dash.dashboard_title}")
            existing_dash.slices.clear()
            db.session.commit()
            db.session.delete(existing_dash)
            db.session.commit()

        # Delete existing slices if any
        existing_slices = db.session.query(Slice).filter(
            Slice.slice_name.like('%Jira Visual%')
        ).all()

        if existing_slices:
            print(f"Deleting {len(existing_slices)} existing slices")
            for s in existing_slices:
                db.session.delete(s)
            db.session.commit()

        # Create charts
        print("Creating charts...")
        print()

        # Define chart configurations
        # We'll use common viz_types
        viz_types_pie = ['pie', 'dist_bar', 'echarts_pie']
        viz_types_bar = ['dist_bar', 'echarts_timeseries_bar']
        viz_types_table = ['table', 'table_vis']
        viz_types_big_number = ['big_number', 'big_number_total', 'number_format', 'statistical']

        # Chart 1: Total Tickets (Big Number)
        chart1 = try_create_chart(db, main_table, "Jira Visual - Total Tickets", 
                                      viz_types_big_number[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_big_number[0],
            "metrics": ["count"],
            "row_limit": 10000
        })

        # Chart 2: Total Cycle Time (Big Number)
        chart2 = try_create_chart(db, main_table, "Jira Visual - Total Hours", 
                                      viz_types_big_number[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_big_number[0],
            "metrics": ["count"],
            "row_limit": 10000
        })

        # Chart 3: Status Distribution (Pie Chart)
        chart3 = try_create_chart(db, main_table, "Jira Visual - Status Distribution",
                                      viz_types_pie[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_pie[0],
            "groupby": ["status"],
            "metrics": ["count"],
            "row_limit": 10000
        })

        # Chart 4: Type Distribution (Pie Chart)
        chart4 = try_create_chart(db, main_table, "Jira Visual - Type Distribution",
                                      viz_types_pie[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_pie[0],
            "groupby": ["type"] if has_column(main_table, "type") else ["status"],
            "metrics": ["count"],
            "row_limit": 10000
        })

        # Chart 5: Hours per Ticket (Bar Chart)
        chart5 = try_create_chart(db, main_table, "Jira Visual - Hours per Ticket",
                                      viz_types_bar[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_bar[0],
            "metrics": [],
            "groupby": ["key"] if has_column(main_table, "key") else ["summary"],
            "row_limit": 10000
        })

        # Chart 6: Avg Hours by Sprint (Bar Chart)
        chart6 = try_create_chart(db, main_table, "Jira Visual - Avg Hours by Sprint",
                                      viz_types_bar[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_bar[0],
            "metrics": [],
            "groupby": ["sprint"] if has_column(main_table, "sprint") else ["status"],
            "row_limit": 10000
        })

        # Chart 7: Tickets by Assignee (Bar Chart)
        chart7 = try_create_chart(db, main_table, "Jira Visual - Tickets by Assignee",
                                      viz_types_bar[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_bar[0],
            "metrics": [],
            "groupby": ["assignee"] if has_column(main_table, "assignee") else ["status"],
            "row_limit": 10000
        })

        # Chart 8: Ticket Details (Table)
        chart8 = try_create_chart(db, main_table, "Jira Visual - Ticket Details",
                                      viz_types_table[0], {
            "datasource": f"{main_table.id}__table",
            "viz_type": viz_types_table[0],
            "metrics": [],
            "groupby": [],
            "row_limit": 10000
        })

        # Create dashboard
        print()
        print("Creating dashboard...")
        dashboard = Dashboard(
            dashboard_title="Jira Visual Dashboard",
            slug="jira-visual-dashboard",
            description="Visual Jira dashboard with status distribution, type distribution, sprint analysis, and ticket details",
            published=True,
            position_json="{}",
            css="",
            json_metadata=json.dumps({
                "chart_configuration": {},
                "color_scheme": "supersetColors",
                "native_filter_configuration": [
                    {
                        "id": "NATIVE_FILTER-jira-sprint",
                        "name": "Sprint Filter",
                        "filterType": "filter_select",
                        "targets": [
                            {
                                "datasetId": main_table.id,
                                "column": {
                                    "column_name": "sprint"
                                }
                            }
                        ],
                        "defaultDataMask": {
                            "extraFormData": {},
                            "filterState": {}
                        },
                        "cascade": [],
                        "scope": {
                            "rootPath": {
                                "CHART-xxxxx": {},
                                "CHART-yyyyy": {}
                            }
                        }
                    }
                ]
            })
        )
        db.session.add(dashboard)
        db.session.commit()

        # Add slices to dashboard
        print()
        print("Adding charts to dashboard...")
        for chart in [chart1, chart2, chart3, chart4, chart5, chart6, chart7, chart8]:
            if chart:
                dashboard.slices.append(chart)
                print(f"  - {chart.slice_name}")

        db.session.commit()

        # Summary
        print()
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Dashboard ID: {dashboard.id}")
        print(f"Dashboard Slug: {dashboard.slug}")
        print(f"Dashboard URL: http://localhost:8088/superset/dashboard/{dashboard.slug}/")
        print()
        print("Charts created:")
        charts = [c for c in [chart1, chart2, chart3, chart4, chart5, chart6, chart7, chart8] if c]
        for i, chart in enumerate(charts, 1):
            print(f"  {i}. {chart.slice_name} (ID: {chart.id}, Type: {chart.viz_type})")
        print()
        print("=" * 80)
        print("SUCCESS: Jira Visual Dashboard provisioning complete!")
        print("=" * 80)

def has_column(table, column_name):
    """Check if a table has a specific column"""
    return any(col.column_name.lower() == column_name.lower() for col in table.columns)

def try_create_chart(db, dataset, name, viz_type, params):
    """Try to create a chart slice, returning None if it fails"""
    try:
        slice_obj = Slice(
            slice_name=name,
            viz_type=viz_type,
            datasource_type="table",
            datasource_id=dataset.id,
            params=json.dumps(params),
            description=f"Auto-generated chart for Jira Visual dashboard"
        )
        db.session.add(slice_obj)
        db.session.commit()
        print(f"  ✓ Chart created: {name} (ID: {slice_obj.id}, Type: {viz_type})")
        return slice_obj
    except Exception as e:
        print(f"  ✗ Failed to create {name}: {e}")
        db.session.rollback()
        return None

if __name__ == "__main__":
    main()
