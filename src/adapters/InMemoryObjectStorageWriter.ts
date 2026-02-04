import type { ObjectStorageWriter } from '../domain/ObjectStorageWriter';

/**
 * In-Memory Object Storage Writer (for testing)
 * Stores data in a Map instead of real storage
 */
export class InMemoryObjectStorageWriter implements ObjectStorageWriter {
  private storage = new Map<string, unknown>();

  async putJson(key: string, body: unknown): Promise<void> {
    this.storage.set(key, body);
  }

  /** Get stored object (for testing) */
  get(key: string): unknown {
    return this.storage.get(key);
  }

  /** Check if key exists (for testing) */
  has(key: string): boolean {
    return this.storage.has(key);
  }

  /** Get all keys (for testing) */
  keys(): string[] {
    return Array.from(this.storage.keys());
  }

  /** Clear storage (for testing) */
  clear(): void {
    this.storage.clear();
  }
}
