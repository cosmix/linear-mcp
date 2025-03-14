import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearAPIService } from '../linear-api';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Issue Retrieval', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('getIssue', () => {
    test('returns full issue details with relationships', async () => {
      const mockIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description with @mention and TEST-2 reference',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        estimate: 5,
        dueDate: new Date('2025-02-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [{ name: 'bug' }] }),
        parent: Promise.resolve({
          id: 'parent-1',
          identifier: 'TEST-0',
          title: 'Parent Issue'
        }),
        children: () => Promise.resolve({
          nodes: [{
            id: 'child-1',
            identifier: 'TEST-2',
            title: 'Child Issue'
          }]
        }),
        relations: () => Promise.resolve({
          nodes: [{
            type: 'blocked',
            relatedIssue: Promise.resolve({
              id: 'blocked-1',
              identifier: 'TEST-3',
              title: 'Blocking Issue'
            })
          }]
        }),
        comments: () => Promise.resolve({
          nodes: [{
            id: 'comment-1',
            body: 'Test comment with @user and TEST-4 reference',
            createdAt: new Date('2025-01-24'),
            updatedAt: new Date('2025-01-24'),
            user: Promise.resolve({ id: 'user-1', name: 'Commenter' })
          }]
        })
      };

      mockClient.issue.mockImplementation(async () => mockIssue);

      const result = await service.getIssue({ 
        issueId: 'TEST-1',
        includeRelationships: true 
      });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description with @mention and TEST-2 reference',
        status: 'In Progress',
        assignee: 'John Doe',
        priority: 1,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'Jane Smith',
        labels: ['bug'],
        estimate: 5,
        dueDate: '2025-02-24T00:00:00.000Z',
        parent: {
          id: 'parent-1',
          identifier: 'TEST-0',
          title: 'Parent Issue'
        },
        subIssues: [{
          id: 'child-1',
          identifier: 'TEST-2',
          title: 'Child Issue'
        }],
        relationships: [
          {
            type: 'parent',
            issueId: 'parent-1',
            identifier: 'TEST-0',
            title: 'Parent Issue'
          },
          {
            type: 'sub',
            issueId: 'child-1',
            identifier: 'TEST-2',
            title: 'Child Issue'
          },
          {
            type: 'blocked',
            issueId: 'blocked-1',
            identifier: 'TEST-3',
            title: 'Blocking Issue'
          }
        ],
        comments: [{
          id: 'comment-1',
          body: 'Test comment with @user and TEST-4 reference',
          userId: 'user-1',
          userName: 'Commenter',
          createdAt: '2025-01-24T00:00:00.000Z',
          updatedAt: '2025-01-24T00:00:00.000Z'
        }],
        mentionedIssues: ['TEST-2', 'TEST-4'],
        mentionedUsers: ['mention', 'user']
      });
    });

    test('handles invalid issue ID', async () => {
      mockClient.issue.mockImplementation(async () => null);

      await expect(service.getIssue({ issueId: 'INVALID' }))
        .rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: INVALID'));
    });

    test('handles API errors gracefully', async () => {
      mockClient.issue.mockImplementation(async () => {
        throw new Error('API Error');
      });

      await expect(service.getIssue({ issueId: 'TEST-1' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'API Error'));
    });

    test('handles null/undefined issue fields', async () => {
      const mockIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: null,
        priority: undefined,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve(null),
        assignee: Promise.resolve(null),
        team: Promise.resolve(null),
        creator: Promise.resolve(null),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] })
      };

      mockClient.issue.mockImplementation(async () => mockIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: null,
        status: undefined,
        assignee: undefined,
        priority: undefined,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: undefined,
        creatorName: undefined,
        labels: [],
        estimate: undefined,
        dueDate: undefined,
        parent: undefined,
        subIssues: [],
        relationships: [],
        mentionedIssues: [],
        mentionedUsers: []
      });
    });
  });

  describe('searchIssues', () => {
    test('returns formatted search results with enhanced metadata', async () => {
      const testIssues = {
        nodes: [
          {
            id: 'issue-1',
            identifier: 'TEST-1',
            title: 'Test Issue 1',
            priority: 1,
            state: Promise.resolve({ name: 'In Progress' }),
            assignee: Promise.resolve({ name: 'John Doe' }),
            team: Promise.resolve({ name: 'Engineering' }),
            labels: () => Promise.resolve({ nodes: [{ name: 'bug' }] }),
          },
          {
            id: 'issue-2',
            identifier: 'TEST-2',
            title: 'Test Issue 2',
            priority: 2,
            state: Promise.resolve({ name: 'Todo' }),
            assignee: Promise.resolve(undefined),
            team: Promise.resolve({ name: 'Design' }),
            labels: () => Promise.resolve({ nodes: [{ name: 'feature' }] }),
          },
        ],
      };

      mockClient.issues.mockImplementation(async () => testIssues);

      const results = await service.searchIssues({ query: 'test' });

      expect(results).toEqual([
        {
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue 1',
          status: 'In Progress',
          assignee: 'John Doe',
          priority: 1,
          teamName: 'Engineering',
          labels: ['bug'],
        },
        {
          id: 'issue-2',
          identifier: 'TEST-2',
          title: 'Test Issue 2',
          status: 'Todo',
          assignee: undefined,
          priority: 2,
          teamName: 'Design',
          labels: ['feature'],
        },
      ]);

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            or: [
              { title: { contains: 'test' } },
              { description: { contains: 'test' } },
            ],
          }]
        }
      });
    });

    test('filters issues assigned to current user', async () => {
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 1,
          state: Promise.resolve({ name: 'In Progress' }),
          assignee: Promise.resolve({ name: 'Current User' }),
          team: Promise.resolve({ name: 'Engineering' }),
          labels: () => Promise.resolve({ nodes: [] }),
        }],
      };

      mockClient.issues.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: '',
        filter: { assignedTo: 'me' }
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            assignee: {
              id: { eq: 'current-user' }
            }
          }]
        }
      });
    });

    test('filters issues created by current user', async () => {
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 1,
          state: Promise.resolve({ name: 'In Progress' }),
          assignee: Promise.resolve(undefined),
          team: Promise.resolve({ name: 'Engineering' }),
          labels: () => Promise.resolve({ nodes: [] }),
        }],
      };

      mockClient.issues.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: '',
        filter: { createdBy: 'me' }
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            creator: {
              id: { eq: 'current-user' }
            }
          }]
        }
      });
    });

    test('combines search query with filters', async () => {
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 1,
          state: Promise.resolve({ name: 'In Progress' }),
          assignee: Promise.resolve({ name: 'Current User' }),
          team: Promise.resolve({ name: 'Engineering' }),
          labels: () => Promise.resolve({ nodes: [] }),
        }],
      };

      mockClient.issues.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: 'bug',
        filter: {
          assignedTo: 'me',
          createdBy: 'me'
        }
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [
            {
              or: [
                { title: { contains: 'bug' } },
                { description: { contains: 'bug' } },
              ],
            },
            {
              assignee: {
                id: { eq: 'current-user' }
              }
            },
            {
              creator: {
                id: { eq: 'current-user' }
              }
            }
          ]
        }
      });
    });

    test('filters issues by project ID', async () => {
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 1,
          state: Promise.resolve({ name: 'In Progress' }),
          assignee: Promise.resolve({ name: 'John Doe' }),
          team: Promise.resolve({ name: 'Engineering' }),
          labels: () => Promise.resolve({ nodes: [] }),
        }],
      };

      mockClient.issues.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: '',
        projectId: 'project-123'
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            project: {
              id: { eq: 'project-123' }
            }
          }]
        }
      });
    });

    test('resolves project name to ID for filtering', async () => {
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 1,
          state: Promise.resolve({ name: 'In Progress' }),
          assignee: Promise.resolve({ name: 'John Doe' }),
          team: Promise.resolve({ name: 'Engineering' }),
          labels: () => Promise.resolve({ nodes: [] }),
        }],
      };

      const mockProjects = {
        nodes: [{
          id: 'project-123',
          name: 'Test Project',
          description: 'Test project description',
          slugId: 'test-project',
          icon: '🧪',
          color: '#ff0000',
          state: Promise.resolve({ name: 'Active', type: 'active' }),
          creator: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
          lead: Promise.resolve(null),
          startDate: null,
          targetDate: null,
          startedAt: null,
          completedAt: null,
          canceledAt: null,
          progress: 0,
          health: 'onTrack',
          teams: () => Promise.resolve({ nodes: [] })
        }],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      };

      mockClient.issues.mockImplementation(async () => testIssues);
      mockClient.projects.mockImplementation(async () => mockProjects);

      await service.searchIssues({
        query: '',
        projectName: 'Test Project'
      });

      expect(mockClient.projects).toHaveBeenCalledWith({
        first: 2,
        after: undefined,
        includeArchived: true,
        filter: { name: { contains: 'Test Project' } }
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            project: {
              id: { eq: 'project-123' }
            }
          }]
        }
      });
    });

    test('returns empty array when no results found', async () => {
      mockClient.issues.mockImplementation(async () => ({ nodes: [] }));

      const results = await service.searchIssues({ query: 'nonexistent' });

      expect(results).toEqual([]);
      expect(mockClient.issues).toHaveBeenCalled();
    });

    test('handles API errors gracefully', async () => {
      mockClient.issues.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.searchIssues({ query: 'test' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'API error'));
    });
  });
});
