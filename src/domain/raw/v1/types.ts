/**
 * RAW Data Contracts v1 - Type Definitions
 *
 * This file defines the type-safe contracts for RAW data ingestion.
 * No AWS dependencies. Pure domain types.
 */

/**
 * Supported data sources
 * @note Only 'jira' and 'github' are currently implemented
 * @see src/domain/raw/v1/sources/ for implementations
 */
export type RawDataSource = 'jira' | 'github';

/**
 * Resource types per source
 * @note Only 'issues' and 'pull-requests' are currently implemented
 */
export type RawResource = 'issues' | 'pull-requests' | string; // Allow extensibility
