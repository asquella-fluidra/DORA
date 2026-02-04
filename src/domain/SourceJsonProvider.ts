/**
 * Source JSON Provider Port (Domain Interface)
 * Abstracts reading raw JSON from various sources
 */

/**
 * Provider that can read raw JSON data from a source and resource
 */
export interface SourceJsonProvider {
  /**
   * Get raw JSON data from a source and resource
   * @param source - Data source identifier (e.g., "jira", "github")
   * @param resource - Resource type (e.g., "issues", "pull-requests")
   * @returns Raw JSON data (unknown - to be validated)
   */
  getJson(source: string, resource: string): Promise<unknown>;
}
