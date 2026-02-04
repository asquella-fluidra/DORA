import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { validateJiraIssuesResponse, validateGitHubPullRequestsResponse } from '../src/domain';

describe('Fake JSON Validation', () => {
  describe('Jira Issues JSON', () => {
    it('should validate Jira fakes/issues.json successfully', async () => {
      const jsonPath = join(process.cwd(), 'data/fakes/jira/issues.json');
      const jsonText = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonText);

      const isValid = validateJiraIssuesResponse(jsonData);

      expect(isValid).toBe(true);

      if (isValid) {
        const issues = (jsonData as { issues: unknown[] }).issues;
        expect(issues).toHaveLength(3);
        expect((issues[0] as { key: string }).key).toBe('DORA-101');
        expect((issues[0] as { fields: { status: { name: string } } }).fields.status.name).toBe('Done');
        expect((issues[1] as { fields: { status: { name: string } } }).fields.status.name).toBe('In Progress');
        expect((issues[2] as { fields: { status: { name: string } } }).fields.status.name).toBe('To Do');
      }
    });

    it('should reject Jira JSON when key field is missing', async () => {
      const jsonPath = join(process.cwd(), 'data/fakes/jira/issues.json');
      const jsonText = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonText);

      // Mutate: remove key from first issue
      if (Array.isArray((jsonData as { issues?: unknown[] }).issues)) {
        delete (jsonData as { issues: Array<{ key?: string }> }).issues[0].key;
      }

      const isValid = validateJiraIssuesResponse(jsonData);

      expect(isValid).toBe(false);
    });

    it('should reject Jira JSON when fields.summary is missing', async () => {
      const jsonPath = join(process.cwd(), 'data/fakes/jira/issues.json');
      const jsonText = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonText);

      // Mutate: remove summary from first issue
      if (Array.isArray((jsonData as { issues?: unknown[] }).issues)) {
        delete (jsonData as { issues: Array<{ fields?: { summary?: string } }> }).issues[0].fields?.summary;
      }

      const isValid = validateJiraIssuesResponse(jsonData);

      expect(isValid).toBe(false);
    });
  });

  describe('GitHub Pull Requests JSON', () => {
    it('should validate GitHub fakes/pull-requests.json successfully', async () => {
      const jsonPath = join(process.cwd(), 'data/fakes/github/pull-requests.json');
      const jsonText = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonText);

      const isValid = validateGitHubPullRequestsResponse(jsonData);

      expect(isValid).toBe(true);

      if (isValid) {
        const prs = jsonData as { number: number; state: string; user: { login: string } }[];
        expect(prs).toHaveLength(3);
        expect(prs[0].number).toBe(42);
        expect(prs[0].state).toBe('merged');
        expect(prs[0].user.login).toBe('alice');
        expect(prs[1].state).toBe('closed');
        expect(prs[2].state).toBe('open');
      }
    });

    it('should reject GitHub JSON when number field is missing', async () => {
      const jsonPath = join(process.cwd(), 'data/fakes/github/pull-requests.json');
      const jsonText = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonText) as unknown[];

      // Mutate: remove number from first PR
      if (Array.isArray(jsonData)) {
        const pr = jsonData[0];
        if (pr && typeof pr === 'object') {
          delete (pr as { number?: number }).number;
        }
      }

      const isValid = validateGitHubPullRequestsResponse(jsonData);

      expect(isValid).toBe(false);
    });

    it('should reject GitHub JSON when user.login is missing', async () => {
      const jsonPath = join(process.cwd(), 'data/fakes/github/pull-requests.json');
      const jsonText = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonText) as unknown[];

      // Mutate: remove user from first PR
      if (Array.isArray(jsonData)) {
        const pr = jsonData[0];
        if (pr && typeof pr === 'object') {
          delete (pr as { user?: object }).user;
        }
      }

      const isValid = validateGitHubPullRequestsResponse(jsonData);

      expect(isValid).toBe(false);
    });
  });
});
