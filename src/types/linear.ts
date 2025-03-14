import { LinearClient } from '@linear/sdk';

// Tool argument interfaces
export interface GetProjectsArgs {
  nameFilter?: string;     // Optional filter by project name
  includeArchived?: boolean; // Whether to include archived projects
  first?: number;          // Pagination: number of items to return (default: 50, max: 100)
  after?: string;          // Pagination: cursor for fetching next page
}

export interface GetProjectUpdatesArgs {
  projectId: string;
  includeArchived?: boolean;
  first?: number;
  after?: string;  // Cursor for pagination
  createdAfter?: string;
  createdBefore?: string;
  userId?: string;  // User ID or 'me' for self
  health?: string;
}

export enum ProjectUpdateHealthType {
  onTrack = "onTrack",
  atRisk = "atRisk",
  offTrack = "offTrack"
}

export interface CreateProjectUpdateArgs {
  projectId: string;              // Required: The project to create an update for
  body?: string;                  // Optional: Content in markdown format
  health?: ProjectUpdateHealthType; // Optional: Health status of the project
  isDiffHidden?: boolean;         // Optional: Whether to hide the diff between updates
}

export interface GetTeamsArgs {
  nameFilter?: string; // Optional filter to search by team name
}

export interface GetIssueArgs {
  issueId: string;
  includeRelationships?: boolean; // Include comments, parent/sub-issues, and related issues
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

// Internal type used by the service for actual Linear API calls
// Comparator types for different field types
export interface StringComparators {
  eq?: string;
  neq?: string;
  in?: string[];
  nin?: string[];
  eqIgnoreCase?: string;
  neqIgnoreCase?: string;
  startsWith?: string;
  notStartsWith?: string;
  endsWith?: string;
  notEndsWith?: string;
  contains?: string;
  notContains?: string;
  containsIgnoreCase?: string;
  notContainsIgnoreCase?: string;
  null?: boolean;
}

export interface NumberComparators {
  eq?: number;
  neq?: number;
  in?: number[];
  nin?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  null?: boolean;
}

export interface DateComparators {
  eq?: string;
  neq?: string;
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  null?: boolean;
}

// Issue field filters
export interface IssueFieldFilters {
  title?: StringComparators;
  description?: StringComparators;
  priority?: NumberComparators;
  estimate?: NumberComparators;
  dueDate?: DateComparators;
  createdAt?: DateComparators;
  updatedAt?: DateComparators;
  completedAt?: DateComparators;
  startedAt?: DateComparators;
  canceledAt?: DateComparators;
  // Relationship filters
  assignee?: { id?: StringComparators; name?: StringComparators };
  creator?: { id?: StringComparators; name?: StringComparators };
  team?: { id?: StringComparators; name?: StringComparators; key?: StringComparators };
  state?: { id?: StringComparators; name?: StringComparators; type?: StringComparators };
  labels?: { name?: StringComparators; every?: { name?: StringComparators } };
  project?: { id?: StringComparators; name?: StringComparators };
}

export interface SearchIssuesArgs {
  query: string;
  includeRelationships?: boolean;
  filter?: IssueFieldFilters & {
    // Maintain backward compatibility
    assignedTo?: string;    // User ID or 'me' for self
    createdBy?: string;     // User ID or 'me' for self
    // Support logical operators
    and?: IssueFieldFilters[];
    or?: IssueFieldFilters[];
  };
  projectId?: string;       // Filter by project ID (backward compatibility)
  projectName?: string;     // Filter by project name (backward compatibility)
}

export interface CreateIssueArgs {
  teamId?: string;  // Optional if parentId is provided
  title: string;
  description?: string;
  parentId?: string;  // Optional parent issue ID, not identifier
  status?: string;
  priority?: number;
  assigneeId?: string;   // User ID or 'me' for self
  labelIds?: string[];  // Optional array of label IDs to attach
}

export interface CreateCommentArgs {
  issueId: string;     // ID of the issue to comment on
  body: string;        // Comment content
}

export interface UpdateIssueArgs {
  issueId: string;      // ID or key of issue to update
  title?: string;       // New title
  description?: string; // New description
  status?: string;      // New status
  priority?: number;    // New priority
  assigneeId?: string;  // User ID or 'me' for self
  labelIds?: string[];  // New labels
}

export interface DeleteIssueArgs {
  issueId: string;  // ID of the issue to delete
}

// Linear data interfaces
export interface LinearComment {
  id: string;
  body: string;
  userId: string;
  userName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LinearRelationship {
  type: 'parent' | 'sub' | 'related' | 'blocked' | 'blocking' | 'duplicate';
  issueId: string;
  identifier: string;
  title: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  status?: string;
  assignee?: string | null;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
  // Enhanced fields that Linear API supports
  teamName?: string;
  creatorName?: string;
  labels?: string[];
  estimate?: number;
  dueDate?: string;
  // Core relationships (always included)
  parent?: {
    id: string;
    identifier: string;
    title: string;
  };
  subIssues: {
    id: string;
    identifier: string;
    title: string;
  }[];
  // Optional relationships (when includeRelationships=true)
  comments?: LinearComment[];
  relationships?: LinearRelationship[]; // Other relationships like blocked/blocking/duplicate
  // Extracted data
  mentionedIssues?: string[]; // Issue identifiers mentioned in description/comments
  mentionedUsers?: string[]; // Usernames mentioned in description/comments
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
}

export interface LinearIssueSearchResult {
  id: string;
  identifier: string;
  title: string;
  status?: string;
  assignee?: string | null;
  priority?: number;
  teamName?: string;
  labels?: string[];
}

export interface LinearProjectUpdate {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  health?: string;
  user: {
    id: string;
    name: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
  };
  diffMarkdown?: string;
  url?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  slugId: string;
  icon?: string;
  color?: string;
  status: {
    name: string;
    type: string;
  };
  creator?: {
    id: string;
    name: string;
  };
  lead?: {
    id: string;
    name: string;
  };
  startDate?: string;
  targetDate?: string;
  startedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  progress?: number;
  health?: string;
  teams: {
    id: string;
    name: string;
    key: string;
  }[];
}

export interface LinearProjectsResponse {
  projects: LinearProject[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
  totalCount: number;
}

export interface LinearProjectUpdateResponse {
  projectUpdates: LinearProjectUpdate[];
  project: {
    id: string;
    name: string;
  };
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
  totalCount: number;
}

// Type guards
export const isGetTeamsArgs = (args: unknown): args is GetTeamsArgs =>
  typeof args === 'object' &&
  args !== null &&
  (typeof (args as GetTeamsArgs).nameFilter === 'undefined' || 
   typeof (args as GetTeamsArgs).nameFilter === 'string');

export const isGetIssueArgs = (args: unknown): args is GetIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as GetIssueArgs).issueId === 'string';

export const isSearchIssuesArgs = (args: unknown): args is SearchIssuesArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as SearchIssuesArgs).query === 'string' &&
  (typeof (args as SearchIssuesArgs).filter === 'undefined' ||
    (typeof (args as SearchIssuesArgs).filter === 'object' &&
      (args as SearchIssuesArgs).filter !== null &&
      (typeof (args as SearchIssuesArgs).filter!.assignedTo === 'undefined' ||
        typeof (args as SearchIssuesArgs).filter!.assignedTo === 'string') &&
      (typeof (args as SearchIssuesArgs).filter!.createdBy === 'undefined' ||
        typeof (args as SearchIssuesArgs).filter!.createdBy === 'string'))) &&
  (typeof (args as SearchIssuesArgs).projectId === 'undefined' ||
    typeof (args as SearchIssuesArgs).projectId === 'string') &&
  (typeof (args as SearchIssuesArgs).projectName === 'undefined' ||
    typeof (args as SearchIssuesArgs).projectName === 'string');

export const isCreateIssueArgs = (args: unknown): args is CreateIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as CreateIssueArgs).title === 'string' &&
  (typeof (args as CreateIssueArgs).teamId === 'undefined' || typeof (args as CreateIssueArgs).teamId === 'string') &&
  (typeof (args as CreateIssueArgs).description === 'undefined' || typeof (args as CreateIssueArgs).description === 'string') &&
  (typeof (args as CreateIssueArgs).parentId === 'undefined' || typeof (args as CreateIssueArgs).parentId === 'string') &&
  (typeof (args as CreateIssueArgs).status === 'undefined' || typeof (args as CreateIssueArgs).status === 'string') &&
  (typeof (args as CreateIssueArgs).priority === 'undefined' || typeof (args as CreateIssueArgs).priority === 'number') &&
  (typeof (args as CreateIssueArgs).assigneeId === 'undefined' || typeof (args as CreateIssueArgs).assigneeId === 'string') &&
  (typeof (args as CreateIssueArgs).labelIds === 'undefined' || (Array.isArray((args as CreateIssueArgs).labelIds) && 
    (args as CreateIssueArgs).labelIds!.every(id => typeof id === 'string'))) &&
  // Ensure either teamId or parentId is provided
  ((args as CreateIssueArgs).teamId !== undefined || (args as CreateIssueArgs).parentId !== undefined);

export const isDeleteIssueArgs = (args: unknown): args is DeleteIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as DeleteIssueArgs).issueId === 'string';

export const isUpdateIssueArgs = (args: unknown): args is UpdateIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as UpdateIssueArgs).issueId === 'string' &&
  (typeof (args as UpdateIssueArgs).title === 'undefined' || typeof (args as UpdateIssueArgs).title === 'string') &&
  (typeof (args as UpdateIssueArgs).description === 'undefined' || typeof (args as UpdateIssueArgs).description === 'string') &&
  (typeof (args as UpdateIssueArgs).status === 'undefined' || typeof (args as UpdateIssueArgs).status === 'string') &&
  (typeof (args as UpdateIssueArgs).priority === 'undefined' || typeof (args as UpdateIssueArgs).priority === 'number') &&
  (typeof (args as UpdateIssueArgs).assigneeId === 'undefined' || typeof (args as UpdateIssueArgs).assigneeId === 'string') &&
  (typeof (args as UpdateIssueArgs).labelIds === 'undefined' || (Array.isArray((args as UpdateIssueArgs).labelIds) && 
    (args as UpdateIssueArgs).labelIds!.every(id => typeof id === 'string')));

export const isCreateCommentArgs = (args: unknown): args is CreateCommentArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as CreateCommentArgs).issueId === 'string' &&
  typeof (args as CreateCommentArgs).body === 'string';

export const isGetProjectsArgs = (args: unknown): args is GetProjectsArgs =>
  typeof args === 'object' &&
  args !== null &&
  (typeof (args as GetProjectsArgs).nameFilter === 'undefined' || 
   typeof (args as GetProjectsArgs).nameFilter === 'string') &&
  (typeof (args as GetProjectsArgs).includeArchived === 'undefined' || 
   typeof (args as GetProjectsArgs).includeArchived === 'boolean') &&
  (typeof (args as GetProjectsArgs).first === 'undefined' || 
   typeof (args as GetProjectsArgs).first === 'number') &&
  (typeof (args as GetProjectsArgs).after === 'undefined' || 
   typeof (args as GetProjectsArgs).after === 'string');

export const isGetProjectUpdatesArgs = (args: unknown): args is GetProjectUpdatesArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as GetProjectUpdatesArgs).projectId === 'string' &&
  (typeof (args as GetProjectUpdatesArgs).includeArchived === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).includeArchived === 'boolean') &&
  (typeof (args as GetProjectUpdatesArgs).first === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).first === 'number') &&
  (typeof (args as GetProjectUpdatesArgs).after === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).after === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).createdAfter === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).createdAfter === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).createdBefore === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).createdBefore === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).userId === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).userId === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).health === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).health === 'string');

export const isCreateProjectUpdateArgs = (args: unknown): args is CreateProjectUpdateArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as CreateProjectUpdateArgs).projectId === 'string' &&
  (typeof (args as CreateProjectUpdateArgs).body === 'undefined' || 
   typeof (args as CreateProjectUpdateArgs).body === 'string') &&
  (typeof (args as CreateProjectUpdateArgs).health === 'undefined' || 
   Object.values(ProjectUpdateHealthType).includes((args as CreateProjectUpdateArgs).health as ProjectUpdateHealthType)) &&
  (typeof (args as CreateProjectUpdateArgs).isDiffHidden === 'undefined' || 
   typeof (args as CreateProjectUpdateArgs).isDiffHidden === 'boolean');

// Helper functions for data cleaning
export const extractMentions = (text: string | null | undefined): { issues: string[]; users: string[] } => {
  if (!text) return { issues: [], users: [] };
  
  // Linear uses identifiers like ABC-123
  const issues = Array.from(text.matchAll(/([A-Z]+-\d+)/g)).map(m => m[1]);
  // Linear uses @ mentions
  const users = Array.from(text.matchAll(/@([a-zA-Z0-9_-]+)/g)).map(m => m[1]);
  
  return {
    issues: [...new Set(issues)], // Deduplicate
    users: [...new Set(users)]    // Deduplicate
  };
};

export const cleanDescription = (description: string | null | undefined): string | null => {
  if (!description) return null;
  
  // Remove excessive whitespace
  let cleaned = description.replace(/\s+/g, ' ').trim();
  
  // Remove common markdown artifacts while preserving content
  cleaned = cleaned
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to just text
    .replace(/#{1,6}\s.*?(?:\n|(?=\*\*|__|_|\[|`))/g, '') // Remove headings until newline or next markdown element
    .replace(/(\*\*|__)(.*?)\1/g, '$2')      // Remove bold markers but keep content
    .replace(/(\*|_)(.*?)\1/g, '$2')         // Remove italic markers but keep content
    .replace(/`([^`]+)`/g, '$1')             // Remove inline code markers but keep content
    
  return cleaned;
};
