/**
 * RAW Envelope v1
 *
 * Common envelope structure for all ingested RAW data.
 * Provides metadata for tracking, idempotency, and correlation.
 */

import type { RawDataSource, RawResource } from './types';

/**
 * RAW Envelope - wraps all ingested data with metadata
 */
export interface RawEnvelope<TPayload = unknown> {
  /** Data source identifier */
  source: RawDataSource;

  /** Resource type (e.g., "issues", "pull-requests") */
  resource: RawResource;

  /** Ingestion date (S3 partition) - YYYY-MM-DD */
  ingestionDate: string;

  /** Production timestamp - ISO 8601 */
  producedAt: string;

  /** Unique correlation ID from upstream system */
  correlationId: string;

  /** Raw data payload from API */
  payload: TPayload;
}

/**
 * Creates a RAW envelope with current timestamp
 */
export function createRawEnvelope<TPayload>(
  source: RawDataSource,
  resource: RawResource,
  ingestionDate: string,
  correlationId: string,
  payload: TPayload
): RawEnvelope<TPayload> {
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
 * Generates S3 key from envelope metadata
 */
export function envelopeToS3Key(envelope: Pick<RawEnvelope, 'source' | 'ingestionDate' | 'resource'>): string {
  return `raw/${envelope.source}/ingestion_date=${envelope.ingestionDate}/${envelope.resource}.json`;
}
