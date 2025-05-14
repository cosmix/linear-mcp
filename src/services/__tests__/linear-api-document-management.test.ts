import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LinearAPIService } from '../linear/index.js';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Document Management', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  // Helper to create a mock document object for testing
  const createMockDocument = (overrides: Record<string, any> = {}) => ({
    id: 'doc-1',
    title: 'Test Document',
    content: 'This is a test document with markdown content.',
    icon: '📄',
    slugId: 'test-document',
    createdAt: new Date('2025-01-24'),
    updatedAt: new Date('2025-01-24'),
    archivedAt: undefined,
    creator: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
    updatedBy: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
    project: Promise.resolve({ id: 'project-1', name: 'Project X' }),
    team: Promise.resolve({ id: 'team-1', name: 'Engineering', key: 'ENG' }),
    url: 'https://linear.app/team/doc/test-document',
    isPublic: false,
    ...overrides
  });

  // --- getDocuments Tests ---
  describe('getDocuments', () => {
    test('retrieves documents with default parameters', async () => {
      const mockDocuments = [
        createMockDocument(),
        createMockDocument({
          id: 'doc-2',
          title: 'Another Document',
          slugId: 'another-document'
        })
      ];

      mockClient.documents.mockImplementation(async () => ({
        nodes: mockDocuments,
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      }));

      const result = await service.getDocuments({});

      expect(mockClient.documents).toHaveBeenCalledWith({
        first: 50,
        after: undefined,
        includeArchived: true,
        filter: undefined
      });

      expect(result.documents.length).toBe(2);
      expect(result.documents[0].id).toBe('doc-1');
      expect(result.documents[0].title).toBe('Test Document');
      expect(result.documents[0].contentPreview).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    test('filters documents by name', async () => {
      mockClient.documents.mockImplementation(async (args: any) => ({
        nodes: [createMockDocument()],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      }));

      await service.getDocuments({
        nameFilter: 'Test'
      });

      // Check that filter was passed correctly
      expect(mockClient.documents).toHaveBeenCalledWith({
        first: 50,
        after: undefined,
        includeArchived: true,
        filter: {
          title: { contains: 'Test' }
        }
      });
    });

    test('filters documents by team and project', async () => {
      mockClient.documents.mockImplementation(async (args: any) => ({
        nodes: [createMockDocument()],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      }));

      await service.getDocuments({
        teamId: 'team-1',
        projectId: 'project-1'
      });

      // Check that filter was passed correctly
      expect(mockClient.documents).toHaveBeenCalledWith({
        first: 50,
        after: undefined,
        includeArchived: true,
        filter: {
          team: { id: { eq: 'team-1' } },
          project: { id: { eq: 'project-1' } }
        }
      });
    });

    test('handles pagination', async () => {
      mockClient.documents.mockImplementation(async (args: any) => ({
        nodes: [createMockDocument()],
        pageInfo: {
          hasNextPage: true,
          endCursor: 'cursor-1'
        }
      }));

      const result = await service.getDocuments({
        first: 10,
        after: 'initial-cursor'
      });

      expect(mockClient.documents).toHaveBeenCalledWith({
        first: 10,
        after: 'initial-cursor',
        includeArchived: true,
        filter: undefined
      });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBe('cursor-1');
    });

    test('handles API errors gracefully', async () => {
      mockClient.documents.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.getDocuments({})).rejects.toThrow(
        /Failed to fetch documents: API error/
      );
    });
  });

  // --- getDocument Tests ---
  describe('getDocument', () => {
    test('retrieves document by ID with full content', async () => {
      const mockDocument = createMockDocument();
      mockClient.document.mockImplementation(async () => mockDocument);

      const result = await service.getDocument({
        documentId: 'doc-1',
        includeFull: true
      });

      expect(mockClient.document).toHaveBeenCalledWith('doc-1');
      expect(result.document.id).toBe('doc-1');
      expect(result.document.title).toBe('Test Document');
      expect(result.document.content).toBe('This is a test document with markdown content.');
      expect(result.document.contentPreview).toBeUndefined(); // Content preview not included when full content is requested
    });

    test('retrieves document by ID with content preview only', async () => {
      const mockDocument = createMockDocument();
      mockClient.document.mockImplementation(async () => mockDocument);

      const result = await service.getDocument({
        documentId: 'doc-1',
        includeFull: false
      });

      expect(result.document.content).toBeUndefined();
      expect(result.document.contentPreview).toBeDefined();
    });

    test('throws error when document not found', async () => {
      mockClient.document.mockImplementation(async () => null);

      await expect(service.getDocument({
        documentId: 'nonexistent-doc'
      })).rejects.toThrow(
        /Document not found: nonexistent-doc/
      );
    });
  });

  // --- createDocument Tests ---
  describe('createDocument', () => {
    test('creates document with required fields', async () => {
      const mockCreatedDocument = createMockDocument();
      
      mockClient.createDocument.mockImplementation(async () => ({
        success: true,
        document: mockCreatedDocument
      }));

      const result = await service.createDocument({
        teamId: 'team-1',
        title: 'Test Document'
      });

      expect(mockClient.createDocument).toHaveBeenCalledWith({
        input: {
          teamId: 'team-1',
          title: 'Test Document'
        }
      });

      expect(result.document.id).toBe('doc-1');
      expect(result.document.title).toBe('Test Document');
    });

    test('creates document with all optional fields', async () => {
      const mockCreatedDocument = createMockDocument({
        isPublic: true,
        icon: '📝'
      });
      
      mockClient.createDocument.mockImplementation(async () => ({
        success: true,
        document: mockCreatedDocument
      }));

      const result = await service.createDocument({
        teamId: 'team-1',
        title: 'Test Document',
        content: 'Document content',
        icon: '📝',
        projectId: 'project-1',
        isPublic: true
      });

      expect(mockClient.createDocument).toHaveBeenCalledWith({
        input: {
          teamId: 'team-1',
          title: 'Test Document',
          content: 'Document content',
          icon: '📝',
          projectId: 'project-1',
          isPublic: true
        }
      });

      expect(result.document.isPublic).toBe(true);
      expect(result.document.icon).toBe('📝');
    });

    test('throws error when create document fails', async () => {
      mockClient.createDocument.mockImplementation(async () => ({
        success: false,
        document: undefined
      }));

      await expect(service.createDocument({
        teamId: 'team-1',
        title: 'Test Document'
      })).rejects.toThrow(
        /Failed to create document/
      );
    });

    test('handles API errors gracefully', async () => {
      mockClient.createDocument.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.createDocument({
        teamId: 'team-1',
        title: 'Test Document'
      })).rejects.toThrow(
        /Failed to create document: API error/
      );
    });
  });

  // --- updateDocument Tests ---
  describe('updateDocument', () => {
    test('updates document title and content', async () => {
      // Mock the existing document fetch
      mockClient.document.mockImplementation(async () => createMockDocument());
      
      // Mock the document update response
      mockClient.documentUpdate.mockImplementation(async () => ({
        success: true,
        document: createMockDocument({
          title: 'Updated Title',
          content: 'Updated content'
        })
      }));

      const result = await service.updateDocument({
        documentId: 'doc-1',
        title: 'Updated Title',
        content: 'Updated content'
      });

      expect(mockClient.documentUpdate).toHaveBeenCalledWith({
        input: {
          id: 'doc-1',
          title: 'Updated Title',
          content: 'Updated content'
        }
      });

      expect(result.document.title).toBe('Updated Title');
      expect(result.document.content).toBe('Updated content');
    });

    test('throws error when document not found for update', async () => {
      mockClient.document.mockImplementation(async () => null);

      await expect(service.updateDocument({
        documentId: 'nonexistent-doc',
        title: 'Updated Title'
      })).rejects.toThrow(
        /Document not found: nonexistent-doc/
      );

      expect(mockClient.documentUpdate).not.toHaveBeenCalled();
    });
  });

  // --- deleteDocument Tests ---
  describe('deleteDocument', () => {
    test('deletes document successfully', async () => {
      mockClient.deleteDocument.mockImplementation(async () => ({
        success: true
      }));

      const result = await service.deleteDocument({
        documentId: 'doc-1'
      });

      expect(mockClient.deleteDocument).toHaveBeenCalledWith({
        id: 'doc-1'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Document deleted successfully');
    });

    test('returns failure when API returns unsuccessful response', async () => {
      mockClient.deleteDocument.mockImplementation(async () => ({
        success: false
      }));

      const result = await service.deleteDocument({
        documentId: 'doc-1'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete document');
    });

    test('handles API errors gracefully', async () => {
      mockClient.deleteDocument.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.deleteDocument({
        documentId: 'doc-1'
      })).rejects.toThrow(
        /Failed to delete document: API error/
      );
    });
  });
});