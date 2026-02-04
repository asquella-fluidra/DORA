import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface IngestionStackProps extends cdk.StackProps {
  environment?: string;
}

export class IngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: IngestionStackProps) {
    super(scope, id, props);

    const environment = props?.environment || this.node.tryGetContext('environment') || 'dev';
    const isProd = environment === 'prod';

    const rawBucket = this.createRawBucket(isProd, environment);
    const dlq = this.createDLQ(environment);
    const lambdaFn = this.createIngestionLambda(isProd, environment, rawBucket, dlq);
    this.createEventBridgeSchedule(environment, lambdaFn);
  }

  private createRawBucket(isProd: boolean, environment: string): s3.Bucket {
    const bucketName = isProd ? undefined : `dora-etl-raw-${environment}-${this.region}`;

    const bucket = new s3.Bucket(this, 'RawBucket', {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      enforceSSL: true,
    });

    new cdk.CfnOutput(this, 'RawBucketName', {
      value: bucket.bucketName,
      description: 'Name of the RAW S3 bucket',
    });

    return bucket;
  }

  private createDLQ(environment: string): sqs.Queue {
    return new sqs.Queue(this, 'IngestDLQ', {
      queueName: `ingest-dlq-${environment}`,
      retentionPeriod: cdk.Duration.days(14),
      visibilityTimeout: cdk.Duration.minutes(5),
    });
  }

  private createIngestionLambda(
    isProd: boolean,
    environment: string,
    rawBucket: s3.Bucket,
    dlq: sqs.Queue
  ): NodejsFunction {
    const logGroup = new logs.LogGroup(this, 'IngestionLambdaLogGroup', {
      logGroupName: `/aws/lambda/ingestion-fake-${environment}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const fn = new NodejsFunction(this, 'IngestionFakeLambda', {
      entry: path.join(__dirname, '../../src/handlers/ingest-fake-data-handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      bundling: {
        target: 'node18',
        sourceMap: true,
        minify: false,
        externalModules: ['@aws-sdk/client-s3'],
      },
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      deadLetterQueue: dlq,
      logGroup,
      environment: {
        LOG_LEVEL: 'INFO',
        RAW_BUCKET_NAME: rawBucket.bucketName,
        INGESTION_DATE: '',
      },
    });

    rawBucket.grantPut(fn);

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: fn.functionName,
      description: 'Name of ingestion fake Lambda function',
    });

    new cdk.CfnOutput(this, 'DLQUrl', {
      value: dlq.queueUrl,
      description: 'URL of DLQ SQS queue',
    });

    return fn;
  }

  private createEventBridgeSchedule(environment: string, lambdaFn: NodejsFunction): void {
    new events.Rule(this, 'IngestionScheduleRule', {
      ruleName: `ingestion-fake-schedule-${environment}`,
      description: 'Daily schedule to trigger fake data ingestion',
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
      targets: [new targets.LambdaFunction(lambdaFn)],
    });
  }
}
