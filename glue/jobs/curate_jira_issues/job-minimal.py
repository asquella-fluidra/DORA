import sys
import traceback as tb_module
import boto3
import datetime
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, explode, coalesce

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

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
debug_key = f"debug/glue/curate_jira_issues/run_date={run_date}/run_id={timestamp}/log.txt"

print(f"=== Glue Job: curate_jira_issues (minimal-v2) ===")
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
    print("DEBUG: Reading JSON envelope from input_prefix")
    df_env = spark.read.json(input_prefix)
    
    rows_env = df_env.count()
    print(f"DEBUG: Envelope rows read: {rows_env}")

    if rows_env == 0:
        error_msg = "No data found in RAW. Exiting gracefully."
        print(f"ERROR: {error_msg}")
        write_debug_log_to_s3(curated_bucket, debug_key, f"ERROR: {error_msg}")
        raise ValueError(error_msg)

    print("DEBUG: Attempting to explode payload.items")
    try:
        df_items = df_env.selectExpr("explode(payload.items) as item")
        print("DEBUG: Successfully exploded payload.items")
    except Exception as e:
        print(f"DEBUG: payload.items failed: {str(e)}")
        print("DEBUG: Attempting to explode payload directly")
        df_items = df_env.selectExpr("explode(payload) as item")
        print("DEBUG: Successfully exploded payload")

    df_out = df_items.select(
        col("item.key").alias("issue_key"),
        col("item.fields.created").alias("created_at"),
        col("item.fields.resolutiondate").alias("resolved_at"),
        col("item.fields.status.name").alias("status"),
        col("item.fields.priority.name").alias("priority"),
        lit(run_date).alias("ingestion_date")
    )

    rows_before_write = df_out.count()
    print(f"DEBUG: Rows to write: {rows_before_write}")

    print(f"DEBUG: Writing Parquet to {output_prefix}")
    df_out.write.mode("overwrite").parquet(output_prefix)

    write_debug_log_to_s3(curated_bucket, debug_key, f"=== Glue Job Success ===\nRows envelope: {rows_env}\nRows written: {rows_before_write}\nOutput location: {output_prefix}")
    print(f"=== Glue Job Completed Successfully ===")
    job.commit()

except Exception as e:
    error_msg = f"{str(e)}"
    full_traceback = tb_module.format_exc()
    print(f"ERROR: {error_msg}")
    print(f"FULL TRACEBACK:\n{full_traceback}")
    write_debug_log_to_s3(curated_bucket, debug_key, f"ERROR: {error_msg}\nFULL TRACEBACK:\n{full_traceback}")
    raise
