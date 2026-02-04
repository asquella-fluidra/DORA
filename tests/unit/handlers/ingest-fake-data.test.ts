import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handler } from '../../../src/handlers/ingest-fake-data-handler';

describe('IngestFakeDataHandler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });
});
