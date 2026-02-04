import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface AnalyticsStackProps extends cdk.StackProps {
    environment?: string;
}
export declare class AnalyticsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: AnalyticsStackProps);
    private createCuratedBucket;
    private createGlueRole;
    private createGlueJob;
    private createGlueDatabase;
    private createCrawlerRole;
    private createCrawler;
    private createKpiJob;
    private createKpiCrawler;
    private createAthenaWorkGroup;
}
//# sourceMappingURL=analytics-stack.d.ts.map