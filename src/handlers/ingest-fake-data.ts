/**
 * Handler: Ingest Fake Data to RAW S3
 *
 * Lambda function that reads fake JSON data from local files,
 * wraps them in RAW envelopes, and writes to S3.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Lambda Event interface
 */
export interface IngestFakeDataEvent {
  ingestionDate?: string; // Optional override (YYYY-MM-DD)
}

/**
 * Handler dependencies (for testing)
 */
export interface HandlerDependencies {
  writer?: { putJson(key: string, body: unknown): Promise<void> };
  provider?: { getJson(source: string, resource: string): Promise<unknown> };
}

/**
 * Handler result
 */
export interface IngestFakeDataResult {
  source: string;
  resource: string;
  key: string;
  itemCount: number;
  success: boolean;
  error?: string;
}

/**
 * JSON Logger
 */
function log(level: 'info' | 'error' | 'warn', message: string, context?: Record<string, unknown>): void {
  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...context,
  };
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.info(JSON.stringify(logEntry));
  }
}

/**
 * Get ingestion date from env or use UTC today
 */
function getIngestionDate(): string {
  const envDate = process.env.INGESTION_DATE;
  if (envDate) {
    log('info', 'Using ingestion date from environment', { ingestionDate: envDate });
    return envDate;
  }

  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const utcDate = `${yyyy}-${mm}-${dd}`;

  log('info', 'Using UTC today as ingestion date', { ingestionDate: utcDate });
  return utcDate;
}

/**
 * Read JSON from file
 */
async function readJsonFile(source: string, resource: string): Promise<unknown> {
  const filePath = join(process.cwd(), 'data', 'fakes', source, `${resource}.json`);
  const jsonText = await readFile(filePath, 'utf-8');
  return JSON.parse(jsonText);
}

/**
 * Create RAW envelope
 */
function createRawEnvelope<TPayload>(
  source: string,
  resource: string,
  ingestionDate: string,
  correlationId: string,
  payload: TPayload
): { source: string; resource: string; ingestionDate: string; producedAt: string; correlationId: string; payload: TPayload } {
  return {
    source,
    resource,
    ingestionDate,
    producedAt: new Date().toISOString(),
    correlationId,
    payload,
  };
}

/**
 * Generate S3 key from envelope metadata
 */
function envelopeToS3Key(source: string, ingestionDate: string, resource: string): string {
  return `raw/${source}/ingestion_date=${ingestionDate}/${resource}.json`;
}

/**
 * Main Lambda Handler
 */
export async function handler(
  event: IngestFakeDataEvent = {},
  deps: HandlerDependencies = {}
): Promise<IngestFakeDataResult[]> {
  log('info', 'Ingest Fake Data handler started', { event });

  const results: IngestFakeDataResult[] = [];
  const ingestionDate = event.ingestionDate || getIngestionDate();
  const rawBucketName = process.env.RAW_BUCKET_NAME;

  if (!rawBucketName) {
    log('error', 'RAW_BUCKET_NAME environment variable is required');
    throw new Error('RAW_BUCKET_NAME environment variable is required');
  }

  log('info', 'Configuration loaded', { rawBucketName, ingestionDate });

  try {
    const writer = deps.writer || new S3Client({});
    const provider = deps.provider || { getJson: readJsonFile };

    const sources = [
      { source: 'jira' as const, resource: 'issues' as const },
      { source: 'github' as const, resource: 'pull-requests' as const },
    ];

    for (const { source, resource } of sources) {
      try {
        log('info', `Ingesting ${source}/${resource}`, { source, resource, ingestionDate });

        const rawData = await provider.getJson(source, resource);

        let validatedPayload: unknown;
        let correlationId: string;

        if (source === 'jira' && resource === 'issues') {
          if (!rawData || typeof rawData !== 'object' || !('issues' in rawData)) {
            throw new Error('Invalid Jira issues response');
          }
          validatedPayload = (rawData as { issues: unknown[] }).issues;
          correlationId = `jira-issues-${ingestionDate}`;
        } else if (source === 'github' && resource === 'pull-requests') {
          if (!rawData || !Array.isArray(rawData)) {
            throw new Error('Invalid GitHub pull requests response');
          }
          validatedPayload = rawData;
          correlationId = `github-pulls-${ingestionDate}`;
        } else {
          throw new Error(`Unsupported source/resource: ${source}/${resource}`);
        }

        const itemCount = Array.isArray(validatedPayload) ? validatedPayload.length : 1;

        const envelope = createRawEnvelope(
          source,
          resource,
          ingestionDate,
          correlationId,
          validatedPayload
        );

        const key = envelopeToS3Key(source, ingestionDate, resource);

        if ('putJson' in writer) {
          await (writer as { putJson: (key: string, body: unknown) => Promise<void> }).putJson(key, envelope);
        } else {
          await (writer as S3Client).send(
            new PutObjectCommand({
              Bucket: rawBucketName,
              Key: key,
              Body: JSON.stringify(envelope),
              ContentType: 'application/json',
            })
          );
        }

        results.push({
          source,
          resource,
          key,
          itemCount,
          success: true,
        });

        log('info', `Successfully ingested ${source}/${resource}`, {
          source,
          resource,
          key,
          itemCount,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Failed to ingest ${source}/${resource}`, {
          source,
          resource,
          error: errorMessage,
        });

        results.push({
          source,
          resource,
          key: '',
          itemCount: 0,
          success: false,
          error: errorMessage,
        });
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalItems: results.reduce((sum, r) => sum + r.itemCount, 0),
    };

    log('info', 'Ingest Fake Data handler completed', { summary, results });
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Ingest Fake Data handler failed with unexpected error', { error: errorMessage });
    throw error;
  }
}
