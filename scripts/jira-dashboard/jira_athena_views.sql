-- Jira Visual Dashboard - Vistas de Athena para análisis

-- VISTA 1: Tickets con Detalles de Cycle Time
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_tickets_detail AS
SELECT
    ticket_key,
    summary,
    status,
    type,
    priority,
    assignee,
    sprint,
    cycle_time_hours,
    CASE
        WHEN cycle_time_hours IS NOT NULL THEN 'Completed'
        WHEN status = 'In Progress' THEN 'In Progress'
        ELSE 'Pending'
    END AS ticket_state,
    created_at,
    updated_at,
    resolved_at,
    ingestion_date
FROM dora_etl_dev.curated_jira_issues
WHERE ticket_key IS NOT NULL;

-- VISTA 2: Horas Invertidas por Ticket
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_hours_per_ticket AS
SELECT
    ticket_key,
    summary,
    assignee,
    sprint,
    cycle_time_hours,
    priority,
    type,
    status
FROM dora_etl_dev.curated_jira_issues
WHERE cycle_time_hours IS NOT NULL
ORDER BY cycle_time_hours DESC;

-- VISTA 3: Media de Horas por Sprint
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_avg_hours_by_sprint AS
SELECT
    sprint,
    COUNT(*) AS total_tickets,
    SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS completed_tickets,
    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_tickets,
    SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) AS todo_tickets,
    SUM(cycle_time_hours) AS total_hours,
    AVG(cycle_time_hours) AS avg_cycle_time_hours,
    MAX(cycle_time_hours) AS max_cycle_time_hours,
    MIN(cycle_time_hours) AS min_cycle_time_hours
FROM dora_etl_dev.curated_jira_issues
WHERE sprint IS NOT NULL
    AND cycle_time_hours IS NOT NULL
GROUP BY sprint
ORDER BY sprint;

-- VISTA 4: Distribución de Tickets por Status
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_status_distribution AS
SELECT
    status,
    COUNT(*) AS ticket_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM dora_etl_dev.curated_jira_issues
GROUP BY status
ORDER BY ticket_count DESC;

-- VISTA 5: Distribución de Tickets por Tipo
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_type_distribution AS
SELECT
    type,
    COUNT(*) AS ticket_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM dora_etl_dev.curated_jira_issues
GROUP BY type
ORDER BY ticket_count DESC;

-- VISTA 6: Distribución por Assignee
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_assignee_distribution AS
SELECT
    assignee,
    COUNT(*) AS ticket_count,
    SUM(cycle_time_hours) AS total_hours,
    ROUND(AVG(cycle_time_hours), 2) AS avg_cycle_time_hours
FROM dora_etl_dev.curated_jira_issues
WHERE assignee IS NOT NULL
GROUP BY assignee
ORDER BY total_hours DESC;

-- VISTA 7: Prioridad de Tickets
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_priority_distribution AS
SELECT
    priority,
    COUNT(*) AS ticket_count,
    SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS completed_count,
    ROUND(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS completion_rate
FROM dora_etl_dev.curated_jira_issues
GROUP BY priority
ORDER BY
    CASE priority
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
    END;

-- VISTA 8: Resumen General
CREATE OR REPLACE VIEW dora_etl_dev.v_jira_overview AS
SELECT
    COUNT(*) AS total_tickets,
    SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS done_tickets,
    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_tickets,
    SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) AS todo_tickets,
    SUM(cycle_time_hours) AS total_cycle_time_hours,
    ROUND(AVG(cycle_time_hours), 2) AS avg_cycle_time_hours,
    MAX(cycle_time_hours) AS max_cycle_time_hours,
    MIN(cycle_time_hours) AS min_cycle_time_hours
FROM dora_etl_dev.curated_jira_issues;
