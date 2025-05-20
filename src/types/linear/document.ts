import { LinearBaseModel } from './base';

// Document-related argument interfaces
export interface GetDocumentsArgs {
  nameFilter?: string;       // Optional filter by document title
  includeArchived?: boolean; // Whether to include archived documents
  teamId?: string;           // Filter documents by team ID
  projectId?: string;        // Filter documents by project ID
  first?: number;            // Pagination: number of items to return (default: 50, max: 100)
  after?: string;            // Pagination: cursor for fetching next page
}

export interface GetDocumentArgs {
  documentId: string;       // The ID of the Linear document
  documentSlug?: string;    // The URL slug of the document (alternative to documentId)
  includeFull?: boolean;    // Whether to include the full document content (default: true)
}

export interface CreateDocumentArgs {
  teamId: string;           // ID of the team this document belongs to
  title: string;            // Title of the document
  content?: string;         // Content of the document in markdown format
  icon?: string;            // Emoji icon for the document
  projectId?: string;       // ID of the project to associate this document with
  isPublic?: boolean;       // Whether the document should be accessible outside the organization
}

export interface UpdateDocumentArgs {
  documentId: string;       // ID of the document to update
  title?: string;           // New title for the document
  content?: string;         // New content for the document in markdown format
  icon?: string;            // New emoji icon for the document
  projectId?: string;       // ID of the project to move this document to
  teamId?: string;          // ID of the team to move this document to
  isArchived?: boolean;     // Whether the document should be archived
  isPublic?: boolean;       // Whether the document should be accessible outside the organization
}

export interface DeleteDocumentArgs {
  documentId: string;       // ID of the document to delete
}

// Document entities and responses
export interface LinearDocument {
  id: string;
  title: string;
  content?: string;         // Document content in markdown format
  contentPreview?: string;  // Truncated preview of content
  icon?: string;            // Emoji icon
  createdAt: string;        // ISO date string
  updatedAt: string;        // ISO date string
  archivedAt?: string;      // ISO date string if archived
  creator?: {
    id: string;
    name: string;
  };
  lastUpdatedBy?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
    key: string;
  };
  url: string;              // URL to the document in Linear
  slugId: string;           // Unique slug for the document URL
  isPublic?: boolean;       // Whether document is publicly accessible
}

export interface LinearDocumentsResponse {
  documents: LinearDocument[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
  totalCount: number;
}

export interface LinearDocumentResponse {
  document: LinearDocument;
}

export interface DeleteDocumentResponse {
  success: boolean;
  message?: string;
}