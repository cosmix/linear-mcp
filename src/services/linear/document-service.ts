import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  CreateDocumentArgs,
  DeleteDocumentArgs,
  DeleteDocumentResponse,
  GetDocumentArgs,
  GetDocumentsArgs,
  LinearDocument,
  LinearDocumentResponse,
  LinearDocumentsResponse,
  UpdateDocumentArgs
} from '../../types/linear/document';
import { LinearBaseService } from './base-service';
import { cleanDescription } from './utils';

export class DocumentService extends LinearBaseService {
  /**
   * Gets a list of documents with optional filtering
   * @param args The document filtering arguments
   * @returns List of documents with pagination info
   */
  async getDocuments(args: GetDocumentsArgs): Promise<LinearDocumentsResponse> {
    try {
      // Validate and normalize arguments
      const first = Math.min(args.first || 50, 100); // Cap at 100
      const includeArchived = args.includeArchived !== false; // Default to true if not explicitly set to false

      // Build filter conditions
      const filter: Record<string, any> = {};

      if (args.nameFilter) {
        filter.title = { contains: args.nameFilter };
      }
      
      if (args.teamId) {
        filter.team = { id: { eq: args.teamId } };
      }
      
      if (args.projectId) {
        filter.project = { id: { eq: args.projectId } };
      }

      // Fetch documents with pagination
      const documents = await (this.client as any).documents({
        first,
        after: args.after,
        includeArchived,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      // Process and format the results
      const formattedDocuments = await Promise.all(
        documents.nodes.map(async (document: any) => {
          // Fetch related data
          const [creator, lastUpdatedBy, project, team] = await Promise.all([
            document.creator,
            document.updatedBy,
            document.project,
            document.team
          ]);

          return {
            id: document.id,
            title: document.title,
            contentPreview: document.content ? cleanDescription(document.content.slice(0, 200)) : undefined,
            icon: document.icon,
            slugId: document.slugId,
            createdAt: document.createdAt?.toISOString(),
            updatedAt: document.updatedAt?.toISOString(),
            archivedAt: document.archivedAt?.toISOString(),
            creator: creator ? {
              id: creator.id,
              name: creator.name
            } : undefined,
            lastUpdatedBy: lastUpdatedBy ? {
              id: lastUpdatedBy.id,
              name: lastUpdatedBy.name
            } : undefined,
            project: project ? {
              id: project.id,
              name: project.name
            } : undefined,
            team: team ? {
              id: team.id,
              name: team.name,
              key: team.key
            } : undefined,
            url: document.url,
            isPublic: document.isPublic
          };
        })
      );

      // Extract pagination information
      const pageInfo = {
        hasNextPage: documents.pageInfo.hasNextPage,
        endCursor: documents.pageInfo.endCursor || undefined
      };

      return {
        documents: formattedDocuments,
        pageInfo,
        totalCount: formattedDocuments.length
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets a single document by ID
   * @param args The document retrieval arguments
   * @returns The requested document
   */
  async getDocument(args: GetDocumentArgs): Promise<LinearDocumentResponse> {
    try {
      // Fetch document by ID or slug
      let document;
      if (args.documentId) {
        document = await this.client.document(args.documentId);
      } else if (args.documentSlug) {
        // Use a GraphQL query to fetch by slug if needed
        throw new McpError(ErrorCode.InvalidRequest, 'Fetching by slug is not yet implemented');
      } else {
        throw new McpError(ErrorCode.InvalidRequest, 'Either documentId or documentSlug must be provided');
      }

      if (!document) {
        throw new McpError(ErrorCode.InvalidRequest, `Document not found: ${args.documentId || args.documentSlug}`);
      }

      // Determine whether to include full content
      const includeFull = args.includeFull !== false; // Default to true if not explicitly set to false

      // Fetch related data
      const [creator, lastUpdatedBy, project, team] = await Promise.all([
        document.creator,
        document.updatedBy,
        document.project,
        document.team
      ]);

      // Format response
      const formattedDocument: LinearDocument = {
        id: document.id,
        title: document.title,
        content: includeFull ? document.content : undefined,
        contentPreview: !includeFull && document.content ? cleanDescription(document.content.slice(0, 200)) : undefined,
        icon: document.icon,
        slugId: document.slugId,
        createdAt: document.createdAt?.toISOString(),
        updatedAt: document.updatedAt?.toISOString(),
        archivedAt: document.archivedAt?.toISOString(),
        creator: creator ? {
          id: creator.id,
          name: creator.name
        } : undefined,
        lastUpdatedBy: lastUpdatedBy ? {
          id: lastUpdatedBy.id,
          name: lastUpdatedBy.name
        } : undefined,
        project: project ? {
          id: project.id,
          name: project.name
        } : undefined,
        team: team ? {
          id: team.id,
          name: team.name,
          key: team.key
        } : undefined,
        url: document.url,
        isPublic: document.isPublic
      };

      return { document: formattedDocument };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates a new document
   * @param args The document creation parameters
   * @returns The created document
   */
  async createDocument(args: CreateDocumentArgs): Promise<LinearDocumentResponse> {
    try {
      // Prepare input for Linear SDK
      const input: Record<string, any> = {
        teamId: args.teamId,
        title: args.title
      };

      // Add optional fields if provided
      if (args.content !== undefined) input.content = args.content;
      if (args.icon !== undefined) input.icon = args.icon;
      if (args.projectId !== undefined) input.projectId = args.projectId;
      if (args.isPublic !== undefined) input.isPublic = args.isPublic;

      // Create document
      const result = await (this.client as any).createDocument(input);

      if (!result.document) {
        throw new McpError(ErrorCode.InternalError, 'Failed to create document');
      }

      const document = result.document;

      // Fetch related data
      const [creator, lastUpdatedBy, project, team] = await Promise.all([
        document.creator,
        document.updatedBy,
        document.project,
        document.team
      ]);

      // Format response
      const formattedDocument: LinearDocument = {
        id: document.id,
        title: document.title,
        content: document.content,
        icon: document.icon,
        slugId: document.slugId,
        createdAt: document.createdAt?.toISOString(),
        updatedAt: document.updatedAt?.toISOString(),
        creator: creator ? {
          id: creator.id,
          name: creator.name
        } : undefined,
        lastUpdatedBy: lastUpdatedBy ? {
          id: lastUpdatedBy.id,
          name: lastUpdatedBy.name
        } : undefined,
        project: project ? {
          id: project.id,
          name: project.name
        } : undefined,
        team: team ? {
          id: team.id,
          name: team.name,
          key: team.key
        } : undefined,
        url: document.url,
        isPublic: document.isPublic
      };

      return { document: formattedDocument };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Updates an existing document
   * @param args The document update parameters
   * @returns The updated document
   */
  async updateDocument(args: UpdateDocumentArgs): Promise<LinearDocumentResponse> {
    try {
      // Fetch the document to verify it exists
      const existingDocument = await this.client.document(args.documentId);
      if (!existingDocument) {
        throw new McpError(ErrorCode.InvalidRequest, `Document not found: ${args.documentId}`);
      }

      // Prepare input for Linear SDK
      const input: Record<string, any> = {
        id: args.documentId
      };

      // Add optional fields if provided
      if (args.title !== undefined) input.title = args.title;
      if (args.content !== undefined) input.content = args.content;
      if (args.icon !== undefined) input.icon = args.icon;
      if (args.projectId !== undefined) input.projectId = args.projectId;
      if (args.teamId !== undefined) input.teamId = args.teamId;
      if (args.isArchived !== undefined) input.isArchived = args.isArchived;
      if (args.isPublic !== undefined) input.isPublic = args.isPublic;

      // Update document
      const result = await (this.client as any).documentUpdate(input);

      if (!result.document) {
        throw new McpError(ErrorCode.InternalError, 'Failed to update document');
      }

      const document = result.document;

      // Fetch related data
      const [creator, lastUpdatedBy, project, team] = await Promise.all([
        document.creator,
        document.updatedBy,
        document.project,
        document.team
      ]);

      // Format response
      const formattedDocument: LinearDocument = {
        id: document.id,
        title: document.title,
        content: document.content,
        icon: document.icon,
        slugId: document.slugId,
        createdAt: document.createdAt?.toISOString(),
        updatedAt: document.updatedAt?.toISOString(),
        archivedAt: document.archivedAt?.toISOString(),
        creator: creator ? {
          id: creator.id,
          name: creator.name
        } : undefined,
        lastUpdatedBy: lastUpdatedBy ? {
          id: lastUpdatedBy.id,
          name: lastUpdatedBy.name
        } : undefined,
        project: project ? {
          id: project.id,
          name: project.name
        } : undefined,
        team: team ? {
          id: team.id,
          name: team.name,
          key: team.key
        } : undefined,
        url: document.url,
        isPublic: document.isPublic
      };

      return { document: formattedDocument };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Deletes a document
   * @param args The document deletion parameters
   * @returns Success status
   */
  async deleteDocument(args: DeleteDocumentArgs): Promise<DeleteDocumentResponse> {
    try {
      // Delete the document
      const result = await (this.client as any).deleteDocument({ id: args.documentId });

      return {
        success: result.success || false,
        message: result.success ? 'Document deleted successfully' : 'Failed to delete document'
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}