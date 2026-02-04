import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import type { ObjectStorageWriter } from '../domain/ObjectStorageWriter';

/**
 * S3 Object Storage Writer (AWS SDK v3)
 * Writes JSON data to S3 bucket
 */
export class S3ObjectStorageWriter implements ObjectStorageWriter {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucketName: string
  ) {}

  async putJson(key: string, body: unknown): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: JSON.stringify(body),
      ContentType: 'application/json',
    });

    await this.s3Client.send(command);
  }
}
