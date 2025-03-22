// Issue-related argument interfaces
export interface GetIssueArgs {
  issueId: string;
  includeRelationships?: boolean; // Include comments, parent/sub-issues, and related issues
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

export interface UpdateIssueArgs {
  issueId: string;      // ID or key of issue to update
  title?: string;       // New title
  description?: string; // New description
  status?: string;      // New status
  priority?: number;    // New priority
  assigneeId?: string;  // User ID or 'me' for self
  labelIds?: string[];  // New labels
  cycleId?: string;     // Cycle ID to assign the issue to
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
