import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LinearAPIService } from '../linear-api';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Issue Management', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('createIssue', () => {
    test('creates issue with required fields', async () => {
      const mockCreatedIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'Backlog' }),
        assignee: Promise.resolve(undefined),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.createIssue.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue
      }));
      mockClient.issue.mockImplementation(async () => mockCreatedIssue);

      const result = await service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description'
      });

      expect(mockClient.createIssue).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: undefined,
        parentId: undefined,
        labelIds: undefined
      });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description',
        status: 'Backlog',
        assignee: undefined,
        priority: 1,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'John Doe',
        labels: [],
        parent: undefined,
        subIssues: [],
        relationships: [],
        mentionedIssues: [],
        mentionedUsers: [],
        estimate: undefined,
        dueDate: undefined,
        comments: undefined
      });
    });

    test('creates issue with self-assignment', async () => {
      const mockCreatedIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'Backlog' }),
        assignee: Promise.resolve({ name: 'Current User' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Current User' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.createIssue.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue
      }));
      mockClient.issue.mockImplementation(async () => mockCreatedIssue);

      await service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        assigneeId: 'me'
      });

      expect(mockClient.createIssue).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: 'current-user',
        parentId: undefined,
        labelIds: undefined
      });
    });

    test('creates subissue with parent', async () => {
      const mockParent = {
        id: 'parent-1',
        identifier: 'TEST-1',
        title: 'Parent Issue',
        team: Promise.resolve({ id: 'team-1', name: 'Engineering' })
      };

      const mockCreatedIssue = {
        id: 'issue-2',
        identifier: 'TEST-2',
        title: 'Child Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'Backlog' }),
        assignee: Promise.resolve(undefined),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(mockParent),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.issue.mockImplementation(async (id: string) => {
        if (id === 'parent-1' || id === 'TEST-1') return mockParent;
        if (id === 'issue-2' || id === 'TEST-2') return mockCreatedIssue;
        return undefined;
      });

      mockClient.createIssue.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue
      }));

      const result = await service.createIssue({
        title: 'Child Issue',
        description: 'Test Description',
        parentId: 'TEST-1'
      });

      expect(mockClient.createIssue).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Child Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: undefined,
        parentId: 'TEST-1',
        labelIds: undefined
      });

      expect(result).toEqual({
        id: 'issue-2',
        identifier: 'TEST-2',
        title: 'Child Issue',
        description: 'Test Description',
        status: 'Backlog',
        assignee: undefined,
        priority: 1,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'John Doe',
        labels: [],
        parent: {
          id: 'parent-1',
          identifier: 'TEST-1',
          title: 'Parent Issue'
        },
        subIssues: [],
        relationships: [
          {
            type: 'parent',
            issueId: 'parent-1',
            identifier: 'TEST-1',
            title: 'Parent Issue'
          }
        ],
        mentionedIssues: [],
        mentionedUsers: [],
        estimate: undefined,
        dueDate: undefined,
        comments: undefined
      });
    });

    test('throws error when parent issue not found', async () => {
      mockClient.issue.mockImplementation(async () => undefined);

      await expect(service.createIssue({
        title: 'Child Issue',
        parentId: 'NONEXISTENT'
      })).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, 'Parent issue not found: NONEXISTENT')
      );

      expect(mockClient.createIssue).not.toHaveBeenCalled();
    });

    test('throws error when create issue fails', async () => {
      mockClient.createIssue.mockImplementation(async () => ({
        success: false,
        issue: undefined
      }));

      await expect(service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue'
      })).rejects.toThrow('MCP error -32603: Failed to create issue: No issue returned');
    });
  });

  describe('updateIssue', () => {
    test('updates issue with all fields', async () => {
      const mockUpdatedIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 2,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'Jane Smith' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [{ name: 'feature' }] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        update: mock(() => Promise.resolve())
      };

      mockClient.issue.mockImplementation(async () => mockUpdatedIssue);

      const result = await service.updateIssue({
        issueId: 'TEST-1',
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'In Progress',
        priority: 2,
        assigneeId: 'user-2',
        labelIds: ['label-2']
      });

      expect(mockUpdatedIssue.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'In Progress',
        priority: 2,
        assigneeId: 'user-2',
        labelIds: ['label-2']
      });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'In Progress',
        assignee: 'Jane Smith',
        priority: 2,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'John Doe',
        labels: ['feature'],
        parent: undefined,
        subIssues: [],
        relationships: [],
        mentionedIssues: [],
        mentionedUsers: [],
        estimate: undefined,
        dueDate: undefined,
        comments: undefined
      });
    });

    test('updates issue with self-assignment', async () => {
      const mockUpdatedIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'Current User' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        update: mock(() => Promise.resolve())
      };

      mockClient.issue.mockImplementation(async () => mockUpdatedIssue);

      await service.updateIssue({
        issueId: 'TEST-1',
        assigneeId: 'me'
      });

      expect(mockUpdatedIssue.update).toHaveBeenCalledWith({
        assigneeId: 'current-user'
      });
    });

    test('updates issue with partial fields', async () => {
      const mockUpdatedIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Original Title',
        description: 'Updated Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'Backlog' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        update: mock(() => Promise.resolve())
      };

      mockClient.issue.mockImplementation(async () => mockUpdatedIssue);

      const result = await service.updateIssue({
        issueId: 'TEST-1',
        description: 'Updated Description'
      });

      expect(mockUpdatedIssue.update).toHaveBeenCalledWith({
        description: 'Updated Description'
      });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Original Title',
        description: 'Updated Description',
        status: 'Backlog',
        assignee: 'John Doe',
        priority: 1,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'John Doe',
        labels: [],
        parent: undefined,
        subIssues: [],
        relationships: [],
        mentionedIssues: [],
        mentionedUsers: [],
        estimate: undefined,
        dueDate: undefined,
        comments: undefined
      });
    });

    test('throws error when issue not found', async () => {
      mockClient.issue.mockImplementation(async () => undefined);

      await expect(service.updateIssue({
        issueId: 'NONEXISTENT',
        title: 'Updated Title'
      })).rejects.toThrow(
        'MCP error -32603: Failed to update issue: MCP error -32600: Issue not found: NONEXISTENT'
      );
    });

    test('throws error when update fails', async () => {
      const mockIssue = {
        id: 'issue-1',
        update: mock(() => Promise.reject(new Error('Update failed')))
      };

      mockClient.issue.mockImplementation(async () => mockIssue);

      await expect(service.updateIssue({
        issueId: 'TEST-1',
        title: 'Updated Title'
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to update issue: Update failed')
      );
    });
  });

  describe('deleteIssue', () => {
    test('deletes issue successfully', async () => {
      const mockIssue = {
        id: 'issue-1',
        delete: mock(() => Promise.resolve())
      };

      mockClient.issue.mockImplementation(async () => mockIssue);

      await service.deleteIssue({ issueId: 'TEST-1' });
      expect(mockIssue.delete).toHaveBeenCalled();
    });

    test('throws error when issue not found', async () => {
      mockClient.issue.mockImplementation(async () => null);

      await expect(service.deleteIssue({ issueId: 'NONEXISTENT' }))
        .rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: NONEXISTENT'));
    });

    test('handles API errors gracefully', async () => {
      const mockIssue = {
        id: 'issue-1',
        delete: mock(() => Promise.reject(new Error('API error')))
      };

      mockClient.issue.mockImplementation(async () => mockIssue);

      await expect(service.deleteIssue({ issueId: 'TEST-1' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'Failed to delete issue: API error'));
    });
  });
});
