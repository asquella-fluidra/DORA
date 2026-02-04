import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as path from 'path';
import { Construct } from 'constructs';

export interface AnalyticsStackProps extends cdk.StackProps {
  environment?: string;
}

export class AnalyticsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AnalyticsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || this.node.tryGetContext('environment') || 'dev';
    const isProd = environment === 'prod';

    const curatedBucket = this.createCuratedBucket(isProd, environment);
    const glueRole = this.createGlueRole(environment, curatedBucket);
    this.createGlueJob(environment, glueRole, curatedBucket);
    const glueDatabase = this.createGlueDatabase(environment);
    const crawlerRole = this.createCrawlerRole(environment, curatedBucket);
    this.createCrawler(environment, crawlerRole, glueDatabase, curatedBucket);
    this.createKpiJob(environment, glueRole, curatedBucket);
    this.createKpiCrawler(environment, crawlerRole, glueDatabase, curatedBucket);
    this.createAthenaWorkGroup(environment, curatedBucket);
  }

  private createCuratedBucket(isProd: boolean, environment: string): s3.Bucket {
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

  private createGlueRole(environment: string, curatedBucket: s3.Bucket): iam.Role {
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
        `${curatedBucket.bucketArn}/analytics/*`,
        `${curatedBucket.bucketArn}/analytics/dora_kpis/*`,
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

  private createGlueJob(environment: string, role: iam.Role, curatedBucket: s3.Bucket): glue.CfnJob {
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

  private createGlueDatabase(environment: string): glue.CfnDatabase {
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

  private createCrawlerRole(environment: string, curatedBucket: s3.Bucket): iam.Role {
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
        `${curatedBucket.bucketArn}/analytics/*`,
        `${curatedBucket.bucketArn}/analytics/dora_kpis/*`,
      ],
    }));

    return role;
  }

  private createCrawler(
    environment: string,
    role: iam.Role,
    database: glue.CfnDatabase,
    curatedBucket: s3.Bucket
  ): glue.CfnCrawler {
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

  private createKpiJob(environment: string, role: iam.Role, curatedBucket: s3.Bucket): glue.CfnJob {
    const jobAsset = new s3_assets.Asset(this, 'BuildDoraKpisScript', {
      path: path.join(__dirname, '../../glue/jobs/build_dora_kpis/job.py'),
    });

    const kpiAssetBucketArn = jobAsset.bucket.bucketArn;

    role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [
        `${kpiAssetBucketArn}/*`,
        `${curatedBucket.bucketArn}/*`,
      ],
    }));

    const job = new glue.CfnJob(this, 'BuildDoraKpisJob', {
      name: `build-dora-kpis-${environment}`,
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
      description: 'Glue PySpark job to build DORA KPIs from CURATED to ANALYTICS (Parquet) - v1 deployed 2026-02-04',
      executionProperty: {
        maxConcurrentRuns: 1,
      },
    });

    new cdk.CfnOutput(this, 'KpiJobName', {
      value: job.name || '',
      description: 'Name of the KPI Glue Job',
    });

    return job;
  }

  private createKpiCrawler(
    environment: string,
    role: iam.Role,
    database: glue.CfnDatabase,
    curatedBucket: s3.Bucket
  ): glue.CfnCrawler {
    const dbName = `dora_etl_${environment}`;

    const crawler = new glue.CfnCrawler(this, 'DoraKpisCrawler', {
      name: `analytics-dora-kpis-${environment}`,
      role: role.roleArn,
      databaseName: dbName,
      targets: {
        s3Targets: [
          {
            path: `s3://${curatedBucket.bucketName}/analytics/dora_kpis/`,
          },
        ],
      },
      tablePrefix: 'analytics_',
      schemaChangePolicy: {
        updateBehavior: 'UPDATE_IN_DATABASE',
        deleteBehavior: 'LOG',
      },
    });

    new cdk.CfnOutput(this, 'KpiCrawlerName', {
      value: crawler.name || '',
      description: 'Name of the KPI Glue Crawler',
    });

    return crawler;
  }

  private createAthenaWorkGroup(environment: string, curatedBucket: s3.Bucket): void {
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
