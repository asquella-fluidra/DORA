/**
 * Object Storage Writer Port (Domain Interface)
 * Abstracts storage operations without coupling to AWS
 */
export interface ObjectStorageWriter {
  /**
   * Write JSON object to storage
   * @param key - Storage key (e.g., S3 object key)
   * @param body - Object to serialize as JSON
   */
  putJson(key: string, body: unknown): Promise<void>;
}
