import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { FileSourceJsonProvider } from '../../../src/adapters';

vi.mock('fs/promises');

describe('FileSourceJsonProvider Error Handling', () => {
  it('should throw error when file does not exist', async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const provider = new FileSourceJsonProvider();

    await expect(provider.getJson('nonexistent', 'data')).rejects.toThrow();
  });

  it('should throw error when JSON is invalid', async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue('{ invalid json }');

    const provider = new FileSourceJsonProvider();

    await expect(provider.getJson('test', 'data')).rejects.toThrow();
  });

  it('should throw error when file content is not JSON', async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue('plain text content');

    const provider = new FileSourceJsonProvider();

    await expect(provider.getJson('test', 'data')).rejects.toThrow();
  });

  it('should return empty object for empty JSON file', async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue('{}');

    const provider = new FileSourceJsonProvider();

    const result = await provider.getJson('test', 'data');
    expect(result).toEqual({});
  });

  it('should return null for null JSON content', async () => {
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue('null');

    const provider = new FileSourceJsonProvider();

    const result = await provider.getJson('test', 'data');
    expect(result).toBeNull();
  });
});
