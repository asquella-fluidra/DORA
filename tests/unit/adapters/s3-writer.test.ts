import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { S3ObjectStorageWriter } from '../../../src/adapters';

describe('S3ObjectStorageWriter', () => {
  const mockSend = vi.fn();
  const mockS3Client = {
    send: mockSend,
  } as unknown as S3Client;
  
  const writer = new S3ObjectStorageWriter(mockS3Client, 'test-bucket');

  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
  });

  it('should call PutObjectCommand with correct parameters', async () => {
    const testKey = 'raw/jira/ingestion_date=2024-01-15/test.json';
    const testBody = { test: 'data' };

    await writer.putJson(testKey, testBody);

    expect(mockSend).toHaveBeenCalledTimes(1);

    const callArgs = mockSend.mock.calls[0][0] as PutObjectCommand;
    expect(callArgs).toBeInstanceOf(PutObjectCommand);
    expect(callArgs.input.Bucket).toBe('test-bucket');
    expect(callArgs.input.Key).toBe(testKey);
    expect(callArgs.input.ContentType).toBe('application/json');
    expect(JSON.parse(callArgs.input.Body?.toString() || '{}')).toEqual(testBody);
  });

  it('should serialize body as JSON', async () => {
    const testBody = { nested: { data: 123 } };

    await writer.putJson('test-key.json', testBody);

    const callArgs = mockSend.mock.calls[0][0] as PutObjectCommand;
    const parsed = JSON.parse(callArgs.input.Body?.toString() || '{}');
    expect(parsed).toEqual(testBody);
  });
});
