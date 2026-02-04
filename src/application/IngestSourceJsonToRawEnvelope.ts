/**
 * Use Case: Ingest Source JSON to RAW Envelope
 *
 * Takes raw JSON from a source, validates it with appropriate schema,
 * and wraps it in a RAW envelope with metadata.
 */

import type { SourceJsonProvider, ObjectStorageWriter } from '../domain';
import {
  createRawEnvelope,
  envelopeToS3Key,
  validateJiraIssuesResponse,
  validateGitHubPullRequestsResponse,
  type RawDataSource,
  type RawResource,
} from '../domain';

/**
 * Ingests source JSON, validates it, wraps in RAW envelope, and writes to storage
 */
export class IngestSourceJsonToRawEnvelope {
  constructor(
    private readonly jsonProvider: SourceJsonProvider,
    private readonly storageWriter: ObjectStorageWriter
  ) {}

  async execute(
    source: RawDataSource,
    resource: RawResource,
    ingestionDate: string
  ): Promise<{ key: string; itemCount: number }> {
    // 1. Get raw JSON
    const rawData = await this.jsonProvider.getJson(source, resource);

    // 2. Validate based on source/resource
    let validatedPayload: unknown;
    let correlationId: string;

    switch (source) {
      case 'jira':
        if (resource === 'issues') {
          if (!validateJiraIssuesResponse(rawData)) {
            throw new Error('Invalid Jira issues response');
          }
          validatedPayload = (rawData as { issues: unknown[] }).issues;
          correlationId = `jira-issues-${ingestionDate}`;
        } else {
          throw new Error(`Jira resource '${resource}' not supported`);
        }
        break;

      case 'github':
        if (resource === 'pull-requests') {
          if (!validateGitHubPullRequestsResponse(rawData)) {
            throw new Error('Invalid GitHub pull requests response');
          }
          validatedPayload = rawData;
          correlationId = `github-pulls-${ingestionDate}`;
        } else {
          throw new Error(`GitHub resource '${resource}' not supported`);
        }
        break;

      default:
        throw new Error(`Source '${source}' not implemented`);
    }

    // 3. Create RAW envelope
    const envelope = createRawEnvelope(
      source,
      resource,
      ingestionDate,
      correlationId,
      validatedPayload
    );

    // 4. Write to storage
    const key = envelopeToS3Key(envelope);
    await this.storageWriter.putJson(key, envelope);

    // 5. Return metadata
    const itemCount = Array.isArray(validatedPayload) ? validatedPayload.length : 1;

    return { key, itemCount };
  }
}
