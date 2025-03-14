import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearAPIService } from '../linear-api';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Comment Management', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('createComment', () => {
    test('creates comment successfully', async () => {
      const mockComment = {
        id: 'comment-1',
        body: 'Test comment',
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        user: Promise.resolve({
          id: 'user-1',
          name: 'John Doe'
        })
      };

      mockClient.issue.mockImplementation(async () => ({ id: 'issue-1' }));
      mockClient.createComment.mockImplementation(async () => ({
        success: true,
        comment: mockComment
      }));

      const result = await service.createComment({
        issueId: 'TEST-1',
        body: 'Test comment'
      });

      expect(result).toEqual({
        id: 'comment-1',
        body: 'Test comment',
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z'
      });

      expect(mockClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-1',
        body: 'Test comment'
      });
    });

    test('throws error when issue not found', async () => {
      mockClient.issue.mockImplementation(async () => null);

      await expect(service.createComment({
        issueId: 'NONEXISTENT',
        body: 'Test comment'
      })).rejects.toThrow(
        'MCP error -32603: Failed to create comment: MCP error -32600: Issue not found: NONEXISTENT'
      );

      expect(mockClient.createComment).not.toHaveBeenCalled();
    });

    test('throws error when comment creation fails', async () => {
      mockClient.issue.mockImplementation(async () => ({ id: 'issue-1' }));
      mockClient.createComment.mockImplementation(async () => ({
        success: false,
        comment: null
      }));

      await expect(service.createComment({
        issueId: 'TEST-1',
        body: 'Test comment'
      })).rejects.toThrow(
        'MCP error -32603: Failed to create comment: MCP error -32603: Failed to create comment'
      );
    });
  });
});
