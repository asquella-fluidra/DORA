/**
 * File-based JSON Provider
 * Reads JSON files from the local filesystem (for testing/fakes)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SourceJsonProvider } from '../domain/SourceJsonProvider';

/**
 * Reads JSON files from data/fakes/<source>/<resource>.json
 */
export class FileSourceJsonProvider implements SourceJsonProvider {
  constructor(private readonly basePath: string = process.cwd()) {}

  async getJson(source: string, resource: string): Promise<unknown> {
    const jsonPath = join(this.basePath, 'data', 'fakes', source, `${resource}.json`);
    const jsonText = await readFile(jsonPath, 'utf-8');
    return JSON.parse(jsonText);
  }
}
