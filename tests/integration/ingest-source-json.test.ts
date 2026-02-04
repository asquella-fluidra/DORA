import { describe, it, expect } from 'vitest';
import { IngestSourceJsonToRawEnvelope } from '../../src/application';
import { FileSourceJsonProvider, InMemoryObjectStorageWriter } from '../../src/adapters';

describe('IngestSourceJsonToRawEnvelope Use Case', () => {
  it('should ingest Jira issues JSON and create RAW envelope', async () => {
    const provider = new FileSourceJsonProvider();
    const writer = new InMemoryObjectStorageWriter();
    const useCase = new IngestSourceJsonToRawEnvelope(provider, writer);

    const result = await useCase.execute('jira', 'issues', '2024-01-15');

    // Verify S3 key
    expect(result.key).toBe('raw/jira/ingestion_date=2024-01-15/issues.json');
    expect(result.itemCount).toBe(3);

    // Verify envelope was written correctly
    const stored = writer.get(result.key) as {
      source: string;
      resource: string;
      ingestionDate: string;
      producedAt: string;
      correlationId: string;
      payload: unknown;
    };

    expect(stored.source).toBe('jira');
    expect(stored.resource).toBe('issues');
    expect(stored.ingestionDate).toBe('2024-01-15');
    expect(stored.producedAt).toBeDefined();
    expect(stored.correlationId).toBe('jira-issues-2024-01-15');
    expect(Array.isArray(stored.payload)).toBe(true);

    // Verify payload structure
    const issues = stored.payload as { key: string; fields: { summary: string } }[];
    expect(issues).toHaveLength(3);
    expect(issues[0].key).toBe('DORA-101');
    expect(issues[0].fields.summary).toBe('Fix authentication bug in login page');
  });

  it('should ingest GitHub pull requests JSON and create RAW envelope', async () => {
    const provider = new FileSourceJsonProvider();
    const writer = new InMemoryObjectStorageWriter();
    const useCase = new IngestSourceJsonToRawEnvelope(provider, writer);

    const result = await useCase.execute('github', 'pull-requests', '2024-01-15');

    // Verify S3 key
    expect(result.key).toBe('raw/github/ingestion_date=2024-01-15/pull-requests.json');
    expect(result.itemCount).toBe(3);

    // Verify envelope was written correctly
    const stored = writer.get(result.key) as {
      source: string;
      resource: string;
      ingestionDate: string;
      producedAt: string;
      correlationId: string;
      payload: unknown;
    };

    expect(stored.source).toBe('github');
    expect(stored.resource).toBe('pull-requests');
    expect(stored.ingestionDate).toBe('2024-01-15');
    expect(stored.correlationId).toBe('github-pulls-2024-01-15');
    expect(Array.isArray(stored.payload)).toBe(true);

    // Verify payload structure
    const prs = stored.payload as { number: number; title: string; state: string }[];
    expect(prs).toHaveLength(3);
    expect(prs[0].number).toBe(42);
    expect(prs[0].state).toBe('merged');
  });

  it('should throw error for invalid Jira JSON', async () => {
    const provider = new FileSourceJsonProvider();
    const writer = new InMemoryObjectStorageWriter();
    const useCase = new IngestSourceJsonToRawEnvelope(provider, writer);

    // Mock invalid JSON by returning empty object
    provider.getJson = async () => ({}); // Invalid

    await expect(
      useCase.execute('jira', 'issues', '2024-01-15')
    ).rejects.toThrow('Invalid Jira issues response');
  });
});
