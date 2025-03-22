// Project-related argument interfaces
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
