// Domain Ports
export type { ObjectStorageWriter } from './ObjectStorageWriter';
export type { SourceJsonProvider } from './SourceJsonProvider';

// RAW v1 Data Contracts
export type {
  RawDataSource,
  RawResource,
} from './raw/v1/types';

export type {
  RawEnvelope,
} from './raw/v1/envelope';

export {
  createRawEnvelope,
  envelopeToS3Key,
} from './raw/v1/envelope';

// Source Validation
export {
  validateJiraIssuesResponse,
  type JiraIssuesResponse,
} from './raw/v1/sources/jira-api-raw';

export {
  validateGitHubPullRequestsResponse,
  type GitHubPullRequestsResponse,
} from './raw/v1/sources/github-api-raw';
