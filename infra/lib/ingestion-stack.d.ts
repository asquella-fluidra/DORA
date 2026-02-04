import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface IngestionStackProps extends cdk.StackProps {
    environment?: string;
}
export declare class IngestionStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: IngestionStackProps);
    private createRawBucket;
    private createDLQ;
    private createIngestionLambda;
    private createEventBridgeSchedule;
}
//# sourceMappingURL=ingestion-stack.d.ts.map