import { LinearClient } from '@linear/sdk';

// Tool argument interfaces
export interface GetIssueArgs {
  issueId: string;
  includeRelationships?: boolean; // Include comments, parent/sub-issues, and related issues
}

export interface SearchIssuesArgs {
  query: string;
  includeRelationships?: boolean;
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
export const isGetIssueArgs = (args: unknown): args is GetIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as GetIssueArgs).issueId === 'string';

export const isSearchIssuesArgs = (args: unknown): args is SearchIssuesArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as SearchIssuesArgs).query === 'string';

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
