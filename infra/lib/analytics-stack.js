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
exports.AnalyticsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3_assets = __importStar(require("aws-cdk-lib/aws-s3-assets"));
const glue = __importStar(require("aws-cdk-lib/aws-glue"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const athena = __importStar(require("aws-cdk-lib/aws-athena"));
const path = __importStar(require("path"));
class AnalyticsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const environment = props?.environment || this.node.tryGetContext('environment') || 'dev';
        const isProd = environment === 'prod';
        const curatedBucket = this.createCuratedBucket(isProd, environment);
        const glueRole = this.createGlueRole(environment, curatedBucket);
        this.createGlueJob(environment, glueRole, curatedBucket);
        const glueDatabase = this.createGlueDatabase(environment);
        const crawlerRole = this.createCrawlerRole(environment, curatedBucket);
        this.createCrawler(environment, crawlerRole, glueDatabase, curatedBucket);
        this.createAthenaWorkGroup(environment, curatedBucket);
    }
    createCuratedBucket(isProd, environment) {
        const bucketName = isProd ? undefined : `dora-etl-curated-${environment}-${this.region}`;
        const bucket = new s3.Bucket(this, 'CuratedBucket', {
            bucketName,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true,
            removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: !isProd,
            enforceSSL: true,
        });
        new cdk.CfnOutput(this, 'CuratedBucketName', {
            value: bucket.bucketName,
            description: 'Name of the CURATED S3 bucket',
        });
        return bucket;
    }
    createGlueRole(environment, curatedBucket) {
        const role = new iam.Role(this, 'GlueJobRole', {
            assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
            ],
        });
        const rawBucketArn = 'arn:aws:s3:::dora-etl-raw-dev-eu-west-1';
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:ListBucket',
            ],
            resources: [
                `${rawBucketArn}`,
                `${rawBucketArn}/raw/jira/*`,
            ],
        }));
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject',
            ],
            resources: [
                `${curatedBucket.bucketArn}`,
                `${curatedBucket.bucketArn}/curated/*`,
                `${curatedBucket.bucketArn}/curated/jira_issues/*`,
                `${curatedBucket.bucketArn}/debug/*`,
            ],
        }));
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));
        return role;
    }
    createGlueJob(environment, role, curatedBucket) {
        const jobAsset = new s3_assets.Asset(this, 'CurateJiraIssuesScript', {
            path: path.join(__dirname, '../../glue/jobs/curate_jira_issues/job-minimal.py'),
        });
        const assetBucketArn = jobAsset.bucket.bucketArn;
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [
                `${assetBucketArn}/*`,
                `${curatedBucket.bucketArn}/*`,
            ],
        }));
        const job = new glue.CfnJob(this, 'CurateJiraIssuesJob', {
            name: `curate-jira-issues-${environment}`,
            role: role.roleArn,
            command: {
                name: 'glueetl',
                scriptLocation: jobAsset.s3ObjectUrl,
                pythonVersion: '3',
            },
            glueVersion: '4.0',
            maxCapacity: 2,
            maxRetries: 0,
            timeout: 60,
            defaultArguments: {
                '--enable-metrics': 'true',
                '--enable-continuous-cloudwatch-log': 'true',
                '--job-language': 'python',
                '--TempDir': `s3://${curatedBucket.bucketName}/temp/`,
                '--additional-python-modules': 'awswrangler==3.4.2',
            },
            description: 'Glue PySpark job to curate Jira issues from RAW (JSON) to CURATED (Parquet) - minimal-v2 deployed 2026-02-04',
            executionProperty: {
                maxConcurrentRuns: 1,
            },
        });
        new cdk.CfnOutput(this, 'GlueJobName', {
            value: job.name || '',
            description: 'Name of the Glue Job',
        });
        return job;
    }
    createGlueDatabase(environment) {
        const dbName = `dora_etl_${environment}`;
        const database = new glue.CfnDatabase(this, 'GlueDatabase', {
            catalogId: this.account,
            databaseInput: {
                name: dbName,
                description: 'DORA ETL Database for Analytics',
            },
        });
        new cdk.CfnOutput(this, 'GlueDatabaseName', {
            value: dbName,
            description: 'Name of the Glue Catalog Database',
        });
        return database;
    }
    createCrawlerRole(environment, curatedBucket) {
        const role = new iam.Role(this, 'CrawlerRole', {
            assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
            ],
        });
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:ListBucket',
            ],
            resources: [
                `${curatedBucket.bucketArn}`,
                `${curatedBucket.bucketArn}/curated/*`,
                `${curatedBucket.bucketArn}/curated/jira_issues/*`,
            ],
        }));
        return role;
    }
    createCrawler(environment, role, database, curatedBucket) {
        const dbName = `dora_etl_${environment}`;
        const crawler = new glue.CfnCrawler(this, 'JiraIssuesCrawler', {
            name: `curated-jira-issues-${environment}`,
            role: role.roleArn,
            databaseName: dbName,
            targets: {
                s3Targets: [
                    {
                        path: `s3://${curatedBucket.bucketName}/curated/jira_issues/`,
                    },
                ],
            },
            tablePrefix: 'curated_',
            schemaChangePolicy: {
                updateBehavior: 'UPDATE_IN_DATABASE',
                deleteBehavior: 'LOG',
            },
        });
        new cdk.CfnOutput(this, 'CrawlerName', {
            value: crawler.name || '',
            description: 'Name of the Glue Crawler',
        });
        return crawler;
    }
    createAthenaWorkGroup(environment, curatedBucket) {
        new athena.CfnWorkGroup(this, 'AthenaWorkGroup', {
            name: `dora-etl-${environment}`,
            workGroupConfiguration: {
                resultConfiguration: {
                    outputLocation: `s3://${curatedBucket.bucketName}/athena-results/`,
                },
                enforceWorkGroupConfiguration: true,
                engineVersion: {
                    selectedEngineVersion: 'Athena engine version 3',
                },
            },
        });
        new cdk.CfnOutput(this, 'AthenaResultsLocation', {
            value: `s3://${curatedBucket.bucketName}/athena-results/`,
            description: 'Athena query results location',
        });
    }
}
exports.AnalyticsStack = AnalyticsStack;
