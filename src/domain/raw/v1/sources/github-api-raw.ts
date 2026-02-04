/**
 * GitHub API RAW Response Types and Validation
 *
 * Defines the minimum expected structure from GitHub API responses.
 * Uses zod for runtime validation of unknown JSON.
 */

import { z } from 'zod';
import { validateWithSchema } from '../validation-helpers';

/**
 * GitHub User (minimal)
 */
export const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
});

/**
 * GitHub Label (optional in response)
 */
export const GitHubLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().optional(),
});

/**
 * GitHub Pull Request (from API)
 */
export const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  node_id: z.string().optional(),
  title: z.string(),
  state: z.enum(['open', 'closed', 'merged']),
  created_at: z.string(), // ISO 8601
  updated_at: z.string(), // ISO 8601
  merged_at: z.string().optional(), // ISO 8601
  user: GitHubUserSchema,
  labels: z.array(GitHubLabelSchema).optional(),
  additions: z.number(),
  deletions: z.number(),
});

/**
 * GitHub Pull Requests List Response (expected shape)
 */
export type GitHubPullRequestsResponse = z.infer<typeof GitHubPullRequestSchema>[];

/**
 * Validates unknown JSON as GitHub PRs response
 */
export const GitHubPullRequestsResponseSchema = z.array(GitHubPullRequestSchema);

export function validateGitHubPullRequestsResponse(data: unknown): data is GitHubPullRequestsResponse {
  return validateWithSchema(GitHubPullRequestsResponseSchema, data);
}

