import sys
import traceback as tb_module
import boto3
import datetime
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, to_timestamp, avg, count, when
from pyspark.sql.types import IntegerType, DoubleType

def write_debug_log_to_s3(bucket, key, content):
    try:
        s3 = boto3.client('s3')
        s3.put_object(Bucket=bucket, Key=key, Body=content)
        print(f"DEBUG: Wrote {len(content)} chars to s3://{bucket}/{key}")
    except Exception as e:
        print(f"DEBUG: Failed to write debug log: {str(e)}")

args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'run_date',
    'curated_bucket'
])

run_date = args['run_date']
curated_bucket = args['curated_bucket']

input_prefix = f"s3://{curated_bucket}/curated/jira_issues/ingestion_date={run_date}/"
output_prefix = f"s3://{curated_bucket}/analytics/dora_kpis/ingestion_date={run_date}/"

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
debug_key = f"debug/glue/dora_kpis/run_date={run_date}/run_id={timestamp}/log.txt"

print(f"=== Glue Job: build_dora_kpis (v1) ===")
print(f"Input prefix:  {input_prefix}")
print(f"Output prefix: {output_prefix}")
print(f"Run date:      {run_date}")
print(f"Debug log key: s3://{curated_bucket}/{debug_key}")

write_debug_log_to_s3(curated_bucket, debug_key, f"=== Glue Job Started ===\nJob Name: {args['JOB_NAME']}\nRun Date: {run_date}\nInput: {input_prefix}\nOutput: {output_prefix}\nTimestamp: {timestamp}")

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

try:
    print("DEBUG: Reading Parquet from input_prefix")
    df = spark.read.parquet(input_prefix)
    
    tickets_total = df.count()
    print(f"DEBUG: Tickets total: {tickets_total}")

    if tickets_total == 0:
        error_msg = "No data found in curated. Exiting gracefully."
        print(f"ERROR: {error_msg}")
        write_debug_log_to_s3(curated_bucket, debug_key, f"ERROR: {error_msg}")
        raise ValueError(error_msg)

    tickets_done = df.filter(col("status") == "Done").count()
    tickets_in_progress = df.filter(col("status") == "In Progress").count()
    tickets_todo = df.filter(col("status") == "To Do").count()
    wip = tickets_in_progress
    
    print(f"DEBUG: Tickets done: {tickets_done}")
    print(f"DEBUG: Tickets in progress: {tickets_in_progress}")
    print(f"DEBUG: Tickets todo: {tickets_todo}")
    print(f"DEBUG: WIP: {wip}")

    df_done_with_times = df.filter(
        (col("status") == "Done") & 
        (col("resolved_at").isNotNull())
    ).withColumn(
        "created_ts", to_timestamp(col("created_at"))
    ).withColumn(
        "resolved_ts", to_timestamp(col("resolved_at"))
    ).withColumn(
        "cycle_time_hours", 
        (col("resolved_ts").cast("double") - col("created_ts").cast("double")) / 3600
    )

    avg_cycle_time_hours = 0.0
    if df_done_with_times.count() > 0:
        avg_cycle_time_hours = df_done_with_times.agg(avg("cycle_time_hours")).collect()[0][0]
    
    print(f"DEBUG: Avg cycle time hours: {avg_cycle_time_hours}")

    produced_at = datetime.datetime.now().isoformat()

    kpi_row = spark.createDataFrame([
        (
            run_date,
            tickets_total,
            tickets_done,
            tickets_in_progress,
            tickets_todo,
            wip,
            avg_cycle_time_hours,
            produced_at
        )
    ], schema="ingestion_date string, tickets_total int, tickets_done int, tickets_in_progress int, tickets_todo int, wip int, avg_cycle_time_hours double, produced_at string")

    print(f"DEBUG: Writing KPI row to {output_prefix}")
    kpi_row.write.mode("overwrite").parquet(output_prefix)

    debug_content = f"""=== Glue Job Success ===
Run Date: {run_date}
Output location: {output_prefix}

Metrics:
- tickets_total: {tickets_total}
- tickets_done: {tickets_done}
- tickets_in_progress: {tickets_in_progress}
- tickets_todo: {tickets_todo}
- wip: {wip}
- avg_cycle_time_hours: {avg_cycle_time_hours}
- produced_at: {produced_at}
"""

    write_debug_log_to_s3(curated_bucket, debug_key, debug_content)
    print(f"=== Glue Job Completed Successfully ===")
    print(debug_content)
    job.commit()

except Exception as e:
    error_msg = f"{str(e)}"
    full_traceback = tb_module.format_exc()
    print(f"ERROR: {error_msg}")
    print(f"FULL TRACEBACK:\n{full_traceback}")
    write_debug_log_to_s3(curated_bucket, debug_key, f"ERROR: {error_msg}\nFULL TRACEBACK:\n{full_traceback}")
    raise
