#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IngestionStack } from '../lib/ingestion-stack';
import { AnalyticsStack } from '../lib/analytics-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'dev';

const envConfig = {
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

new IngestionStack(app, `IngestionStack-${environment}`, {
  env: envConfig,
});

new AnalyticsStack(app, `AnalyticsStack-${environment}`, {
  env: envConfig,
});
