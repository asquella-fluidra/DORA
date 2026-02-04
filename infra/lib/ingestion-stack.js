"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const path = __importStar(require("path"));
class IngestionStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const environment = props?.environment || this.node.tryGetContext('environment') || 'dev';
        const isProd = environment === 'prod';
        const rawBucket = this.createRawBucket(isProd, environment);
        const dlq = this.createDLQ(environment);
        const lambdaFn = this.createIngestionLambda(isProd, environment, rawBucket, dlq);
        this.createEventBridgeSchedule(environment, lambdaFn);
    }
    createRawBucket(isProd, environment) {
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
    createDLQ(environment) {
        return new sqs.Queue(this, 'IngestDLQ', {
            queueName: `ingest-dlq-${environment}`,
            retentionPeriod: cdk.Duration.days(14),
            visibilityTimeout: cdk.Duration.minutes(5),
        });
    }
    createIngestionLambda(isProd, environment, rawBucket, dlq) {
        const logGroup = new logs.LogGroup(this, 'IngestionLambdaLogGroup', {
            logGroupName: `/aws/lambda/ingestion-fake-${environment}`,
            removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_WEEK,
        });
        const fn = new aws_lambda_nodejs_1.NodejsFunction(this, 'IngestionFakeLambda', {
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
    createEventBridgeSchedule(environment, lambdaFn) {
        new events.Rule(this, 'IngestionScheduleRule', {
            ruleName: `ingestion-fake-schedule-${environment}`,
            description: 'Daily schedule to trigger fake data ingestion',
            schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
            targets: [new targets.LambdaFunction(lambdaFn)],
        });
    }
}
exports.IngestionStack = IngestionStack;
