import sys
import traceback as tb_module
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, explode
from pyspark.sql.types import StructType, StructField, StringType, TimestampType

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
    'raw_bucket',
    'curated_bucket'
])

run_date = args['run_date']
raw_bucket = args['raw_bucket']
curated_bucket = args['curated_bucket']

input_prefix = f"s3://{raw_bucket}/raw/jira/ingestion_date={run_date}/"
output_prefix = f"s3://{curated_bucket}/curated/jira_issues/ingestion_date={run_date}/"

print(f"=== Glue Job: curate_jira_issues (v1.2) ===")
print(f"Input prefix:  {input_prefix}")
print(f"Output prefix: {output_prefix}")
print(f"Run date:      {run_date}")

job_run_id = args.get('--JOB_RUN_ID', 'unknown')
debug_key = f"debug/glue/curate_jira_issues/run_date={run_date}/run_id={job_run_id}/log.txt"

print(f"DEBUG: Run ID = {job_run_id}")
print(f"DEBUG: Debug log key = s3://{curated_bucket}/{debug_key}")

write_debug_log_to_s3(curated_bucket, debug_key, f"=== Glue Job Started ===\nJob Name: {args['JOB_NAME']}\nRun Date: {run_date}\nInput: {input_prefix}\nOutput: {output_prefix}\nRun ID: {job_run_id}")

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

print("DEBUG: After job.init()")

try:
    print("DEBUG: Attempting to read from input_prefix")
    df_raw = spark.read.json(input_prefix)
    
    rows_read = df_raw.count()
    print(f"DEBUG: Rows read from RAW: {rows_read}")

    if rows_read == 0:
        error_msg = "No data found in RAW. Exiting gracefully."
        print(f"ERROR: {error_msg}")
        write_debug_log_to_s3(curated_bucket, debug_key, f"ERROR: {error_msg}")
        job.commit()
        sys.exit(0)

    df_exploded = df_raw.withColumn("issue", explode(col("payload")))
    
    df_flattened = df_exploded.select(
        col("issue.key").alias("issue_key"),
        col("issue.fields.created").alias("created_at"),
        col("issue.fields.resolutiondate").alias("resolved_at"),
        col("issue.fields.status.name").alias("status"),
        col("issue.fields.priority.name").alias("priority")
    )

    df_curated = df_flattened.na.fill({
        'status': 'Unknown',
        'priority': 'Unknown',
        'created_at': None,
        'resolved_at': None
    })

    print("DEBUG: About to write Parquet...")
    df_curated.write.mode("overwrite").parquet(output_prefix)

    rows_written = df_curated.count()
    print(f"DEBUG: Rows written to CURATED (Parquet): {rows_written}")
    
    write_debug_log_to_s3(curated_bucket, debug_key, f"=== Glue Job Success ===\nRows read: {rows_read}\nRows written: {rows_written}\nOutput location: {output_prefix}")
    
    print(f"=== Glue Job Completed Successfully ===")
    
except Exception as e:
    error_msg = f"{str(e)}"
    full_traceback = tb_module.format_exc()
    print(f"ERROR: {error_msg}")
    print(f"FULL TRACEBACK:\n{full_traceback}")
    write_debug_log_to_s3(curated_bucket, debug_key, f"ERROR: {error_msg}\nFULL TRACEBACK:\n{full_traceback}")
    job.commit()
    sys.exit(1)

job.commit()
