/**
 * Jira API RAW Response Types and Validation
 *
 * Defines the minimum expected structure from Jira API responses.
 * Uses zod for runtime validation of unknown JSON.
 */

import { z } from 'zod';
import { validateWithSchema } from '../validation-helpers';

/**
 * Jira Issue Status
 */
export const JiraStatusSchema = z.object({
  name: z.string(),
});

/**
 * Jira Issue Priority
 */
export const JiraPrioritySchema = z.object({
  name: z.string(),
});

/**
 * Jira Issue Type
 */
export const JiraIssueTypeSchema = z.object({
  name: z.string(),
});

/**
 * Jira Issue Fields
 */
export const JiraIssueFieldsSchema = z.object({
  summary: z.string(),
  status: JiraStatusSchema,
  created: z.string(), // ISO 8601
  updated: z.string(), // ISO 8601
  resolutiondate: z.string().optional(), // ISO 8601
  priority: JiraPrioritySchema,
  issuetype: JiraIssueTypeSchema,
});

/**
 * Jira Issue (from API search/list)
 */
export const JiraIssueSchema = z.object({
  key: z.string(),
  fields: JiraIssueFieldsSchema,
});

/**
 * Jira Issues List Response (expected shape)
 */
export type JiraIssuesResponse = {
  startAt: number;
  maxResults: number;
  total: number;
  issues: z.infer<typeof JiraIssueSchema>[];
};

/**
 * Validates unknown JSON as Jira issues response
 */
export const JiraIssuesResponseSchema = z.object({
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  issues: z.array(JiraIssueSchema),
});

export function validateJiraIssuesResponse(data: unknown): data is JiraIssuesResponse {
  return validateWithSchema(JiraIssuesResponseSchema, data);
}

