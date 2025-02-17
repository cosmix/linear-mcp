import { LinearClient } from '@linear/sdk';

// Tool argument interfaces
export interface GetTeamsArgs {
  nameFilter?: string; // Optional filter to search by team name
}

export interface GetIssueArgs {
  issueId: string;
  includeRelationships?: boolean; // Include comments, parent/sub-issues, and related issues
}

export interface SearchIssuesArgs {
  query: string;
  includeRelationships?: boolean;
}

export interface CreateIssueArgs {
  teamId?: string;  // Optional if parentId is provided
  title: string;
  description?: string;
  parentId?: string;  // Optional parent issue ID, not identifier
  status?: string;
  priority?: number;
  assigneeId?: string;
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
  assigneeId?: string;  // New assignee
  labelIds?: string[];  // New labels
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
  typeof (args as SearchIssuesArgs).query === 'string';

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
