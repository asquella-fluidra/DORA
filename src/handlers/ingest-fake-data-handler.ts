import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface IngestFakeDataEvent {
  ingestionDate?: string;
}

export interface HandlerDependencies {
  writer?: { putJson(key: string, body: unknown): Promise<void> };
  provider?: { getJson(source: string, resource: string): Promise<unknown> };
}

export interface IngestFakeDataResult {
  source: string;
  resource: string;
  key: string;
  itemCount: number;
  success: boolean;
  error?: string;
}

const FAKE_JIRA_ISSUES = {
  startAt: 0,
  maxResults: 3,
  total: 3,
  issues: [
    {
      key: 'DORA-101',
      fields: {
        summary: 'Fix authentication bug in login page',
        status: { name: 'Done' },
        created: '2024-01-10T09:00:00.000Z',
        updated: '2024-01-15T14:30:00.000Z',
        resolutiondate: '2024-01-15T14:30:00.000Z',
        priority: { name: 'High' },
        issuetype: { name: 'Bug' }
      }
    },
    {
      key: 'DORA-102',
      fields: {
        summary: 'Add user profile page',
        status: { name: 'In Progress' },
        created: '2024-01-12T10:00:00.000Z',
        updated: '2024-01-15T16:00:00.000Z',
        priority: { name: 'Medium' },
        issuetype: { name: 'Story' }
      }
    },
    {
      key: 'DORA-103',
      fields: {
        summary: 'Performance optimization for dashboard',
        status: { name: 'To Do' },
        created: '2024-01-14T11:00:00.000Z',
        updated: '2024-01-14T11:00:00.000Z',
        priority: { name: 'Low' },
        issuetype: { name: 'Task' }
      }
    }
  ]
};

const FAKE_GITHUB_PULL_REQUESTS = [
  {
    id: 123456789,
    number: 42,
    node_id: 'PR_kwDOABC123',
    title: 'Add user authentication feature',
    state: 'merged',
    created_at: '2024-01-10T10:00:00.000Z',
    updated_at: '2024-01-15T14:30:00.000Z',
    merged_at: '2024-01-15T14:30:00.000Z',
    user: { login: 'alice', id: 1001 },
    labels: [
      { id: 1, name: 'feature', color: '007bff' },
      { id: 2, name: 'auth', color: '28a745' }
    ],
    additions: 150,
    deletions: 50
  },
  {
    id: 987654321,
    number: 43,
    node_id: 'PR_kwDOABC124',
    title: 'Fix CSS regression in dashboard',
    state: 'closed',
    created_at: '2024-01-12T11:30:00.000Z',
    updated_at: '2024-01-14T16:45:00.000Z',
    user: { login: 'bob', id: 1002 },
    labels: [{ id: 3, name: 'bug', color: 'dc3545' }],
    additions: 25,
    deletions: 10
  },
  {
    id: 456789123,
    number: 44,
    node_id: 'PR_kwDOABC125',
    title: 'Refactor data processing pipeline',
    state: 'open',
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T17:00:00.000Z',
    user: { login: 'charlie', id: 1003 },
    labels: [
      { id: 4, name: 'refactor', color: '6c757d' },
      { id: 5, name: 'performance', color: 'ffc107' }
    ],
    additions: 320,
    deletions: 180
  }
];

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

function envelopeToS3Key(source: string, ingestionDate: string, resource: string): string {
  return `raw/${source}/ingestion_date=${ingestionDate}/${resource}.json`;
}

async function getFakeJsonData(source: string, resource: string): Promise<unknown> {
  if (source === 'jira' && resource === 'issues') {
    return FAKE_JIRA_ISSUES;
  }
  if (source === 'github' && resource === 'pull-requests') {
    return FAKE_GITHUB_PULL_REQUESTS;
  }
  throw new Error(`Unsupported source/resource: ${source}/${resource}`);
}

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
    const provider = deps.provider || { getJson: getFakeJsonData };

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
