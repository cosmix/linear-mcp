import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LinearAPIService, LinearClientInterface } from '../linear-api';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService', () => {
  let service: LinearAPIService;
  let mockClient: LinearClientInterface;
  let issueFn: ReturnType<typeof mock>;
  let issuesFn: ReturnType<typeof mock>;
  let createIssueFn: ReturnType<typeof mock>;
  let teamsFn: ReturnType<typeof mock>;

  beforeEach(() => {
    // Setup mocks
    issueFn = mock(() => Promise.resolve(null));
    issuesFn = mock(() => Promise.resolve({ nodes: [] }));
    createIssueFn = mock(() => Promise.resolve({ success: true, issue: null }));
    teamsFn = mock(() => Promise.resolve({ nodes: [] }));
    
    // Create mock client
    mockClient = {
      issue: issueFn,
      issues: issuesFn,
      createIssue: createIssueFn,
      teams: teamsFn,
      createComment: mock(() => Promise.resolve({ success: true, comment: null })) as any
    };
    
    // Create service instance with mock client
    service = new LinearAPIService(mockClient);
  });

  describe('constructor', () => {
    test('throws error when API key is missing', () => {
      expect(() => new LinearAPIService('')).toThrow('LINEAR_API_KEY is required');
    });

    test('creates instance with valid API key', () => {
      const serviceWithKey = new LinearAPIService('test-api-key');
      expect(serviceWithKey).toBeInstanceOf(LinearAPIService);
      expect(serviceWithKey).toBeDefined();
    });

    test('creates instance with client interface', () => {
      expect(service).toBeInstanceOf(LinearAPIService);
      expect(service).toBeDefined();
    });
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
        assignee: Promise.resolve(null),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      createIssueFn.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue
      }));
      issueFn.mockImplementation(async () => mockCreatedIssue);

      const result = await service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description'
      });

      expect(createIssueFn).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: undefined,
        parentId: undefined
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
        assignee: Promise.resolve(null),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(mockParent),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async (id) => {
        if (id === 'parent-1' || id === 'TEST-1') return mockParent;
        if (id === 'issue-2' || id === 'TEST-2') return mockCreatedIssue;
        return null;
      });

      createIssueFn.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue
      }));

      const result = await service.createIssue({
        title: 'Child Issue',
        description: 'Test Description',
        parentId: 'TEST-1'
      });

      expect(createIssueFn).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Child Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: undefined,
        parentId: 'TEST-1'
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
      issueFn.mockImplementation(async () => null);

      await expect(service.createIssue({
        title: 'Child Issue',
        parentId: 'NONEXISTENT'
      })).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, 'Parent issue not found: NONEXISTENT')
      );

      expect(createIssueFn).not.toHaveBeenCalled();
    });

    test('throws error when create issue fails', async () => {
      createIssueFn.mockImplementation(async () => ({
        success: false,
        issue: null
      }));

      await expect(service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue'
      })).rejects.toThrow('MCP error -32603: Failed to create issue: No issue returned');
    });
  });

  describe('getIssue', () => {
    test('returns formatted issue with relationships when requested', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockTeam = { id: 'team-1', name: 'Engineering', key: 'eng' };
      const mockLabel = { id: 'label-1', name: 'bug' };
      const mockComment = {
        id: 'comment-1',
        body: 'Test comment mentioning TEST-2 and @jane',
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        user: Promise.resolve(mockUser),
      };
      const mockParent = {
        id: 'parent-1',
        identifier: 'TEST-2',
        title: 'Parent Issue',
      };
      const mockChild = {
        id: 'child-1',
        identifier: 'TEST-3',
        title: 'Child Issue',
      };
      const mockRelation = {
        type: 'blocking',
        relatedIssue: Promise.resolve({
          id: 'related-1',
          identifier: 'TEST-4',
          title: 'Related Issue',
        }),
      };

      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description mentioning TEST-5 and @john',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        estimate: 2,
        dueDate: new Date('2025-02-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve(mockUser),
        team: Promise.resolve(mockTeam),
        creator: Promise.resolve(mockUser),
        labels: () => Promise.resolve({ nodes: [mockLabel] }),
        comments: () => Promise.resolve({ nodes: [mockComment] }),
        parent: Promise.resolve(mockParent),
        children: () => Promise.resolve({ nodes: [mockChild] }),
        relations: () => Promise.resolve({ nodes: [mockRelation] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1', includeRelationships: true });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description mentioning TEST-5 and @john',
        status: 'In Progress',
        assignee: 'John Doe',
        priority: 1,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'John Doe',
        labels: ['bug'],
        estimate: 2,
        dueDate: '2025-02-24T00:00:00.000Z',
        parent: {
          id: 'parent-1',
          identifier: 'TEST-2',
          title: 'Parent Issue'
        },
        subIssues: [{
          id: 'child-1',
          identifier: 'TEST-3',
          title: 'Child Issue'
        }],
        comments: [{
          id: 'comment-1',
          body: 'Test comment mentioning TEST-2 and @jane',
          userId: 'user-1',
          userName: 'John Doe',
          createdAt: '2025-01-24T00:00:00.000Z',
          updatedAt: '2025-01-24T00:00:00.000Z',
        }],
        relationships: [
          {
            type: 'parent',
            issueId: 'parent-1',
            identifier: 'TEST-2',
            title: 'Parent Issue',
          },
          {
            type: 'sub',
            issueId: 'child-1',
            identifier: 'TEST-3',
            title: 'Child Issue',
          },
          {
            type: 'blocking',
            issueId: 'related-1',
            identifier: 'TEST-4',
            title: 'Related Issue',
          },
        ],
        mentionedIssues: ['TEST-5', 'TEST-2'],
        mentionedUsers: ['john', 'jane'],
      });
      expect(issueFn).toHaveBeenCalledWith('TEST-1');
    });

    test('returns basic issue without relationships by default', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [{ name: 'bug' }] }),
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result).toEqual({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Test Description',
        status: 'In Progress',
        assignee: 'John Doe',
        priority: 1,
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
        teamName: 'Engineering',
        creatorName: 'Jane Smith',
        labels: ['bug'],
        parent: undefined,
        subIssues: [],
        relationships: [],
        mentionedIssues: [],
        mentionedUsers: [],
      });
    });

    test('throws McpError when issue not found', async () => {
      issueFn.mockImplementation(async () => null);

      await expect(service.getIssue({ issueId: 'NONEXISTENT' }))
        .rejects
        .toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: NONEXISTENT'));
    });
  });

  describe('getTeams', () => {
    test('returns all teams when no filter provided', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: 'Design team' }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});

      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
        { id: 'team-2', name: 'Design', key: 'DES', description: 'Design team' }
      ]);
      expect(teamsFn).toHaveBeenCalled();
    });

    test('filters teams by name', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: 'Design team' }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({ nameFilter: 'eng' });

      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' }
      ]);
      expect(teamsFn).toHaveBeenCalled();
    });

    test('filters teams by key', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: 'Design team' }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({ nameFilter: 'des' });

      expect(result).toEqual([
        { id: 'team-2', name: 'Design', key: 'DES', description: 'Design team' }
      ]);
      expect(teamsFn).toHaveBeenCalled();
    });

    test('handles empty teams response', async () => {
      teamsFn.mockImplementation(async () => ({ nodes: [] }));

      const result = await service.getTeams({});

      expect(result).toEqual([]);
      expect(teamsFn).toHaveBeenCalled();
    });

    test('handles API errors', async () => {
      teamsFn.mockImplementation(async () => {
        throw new Error('API Error');
      });

      await expect(service.getTeams({}))
        .rejects
        .toThrow(new McpError(ErrorCode.InternalError, 'Failed to fetch teams: API Error'));
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
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        update: mock(() => Promise.resolve())
      };

      issueFn.mockImplementation(async () => mockUpdatedIssue);

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
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        update: mock(() => Promise.resolve())
      };

      issueFn.mockImplementation(async () => mockUpdatedIssue);

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
      issueFn.mockImplementation(async () => null);

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

      issueFn.mockImplementation(async () => mockIssue);

      await expect(service.updateIssue({
        issueId: 'TEST-1',
        title: 'Updated Title'
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to update issue: Update failed')
      );
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

      issuesFn.mockImplementation(async () => testIssues);

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

      expect(issuesFn).toHaveBeenCalledWith({
        filter: {
          or: [
            { title: { contains: 'test' } },
            { description: { contains: 'test' } },
          ],
        },
      });
    });

    test('returns empty array when no results found', async () => {
      issuesFn.mockImplementation(async () => ({ nodes: [] }));

      const results = await service.searchIssues({ query: 'nonexistent' });

      expect(results).toEqual([]);
      expect(issuesFn).toHaveBeenCalled();
    });
  });

  describe('createComment', () => {
    let createCommentFn: ReturnType<typeof mock>;

    beforeEach(() => {
      // Get reference to the createComment mock
      createCommentFn = mockClient.createComment as ReturnType<typeof mock>;
    });

    test('creates comment with required fields', async () => {
      const mockCreatedComment = {
        id: 'comment-1',
        body: 'Test comment mentioning TEST-2 and @jane',
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        user: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
      };

      // Mock issue existence check
      const mockIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
      };
      issueFn.mockImplementation(async () => mockIssue);

      // Mock comment creation
      createCommentFn.mockImplementation(async () => ({
        success: true,
        comment: Promise.resolve(mockCreatedComment)
      }));

      const result = await service.createComment({
        issueId: 'TEST-1',
        body: 'Test comment mentioning TEST-2 and @jane'
      });

      expect(createCommentFn).toHaveBeenCalledWith({
        issueId: 'issue-1',
        body: 'Test comment mentioning TEST-2 and @jane'
      });

      expect(result).toEqual({
        id: 'comment-1',
        body: 'Test comment mentioning TEST-2 and @jane',
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z',
      });
    });

    test('throws error when issue not found', async () => {
      issueFn.mockImplementation(async () => null);

      await expect(service.createComment({
        issueId: 'NONEXISTENT',
        body: 'Test comment'
      })).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, 'Issue not found: NONEXISTENT')
      );

      expect(createCommentFn).not.toHaveBeenCalled();
    });

    test('throws error when comment creation fails', async () => {
      // Mock issue existence check
      const mockIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
      };
      issueFn.mockImplementation(async () => mockIssue);

      // Mock comment creation failure
      createCommentFn.mockImplementation(async () => ({
        success: false,
        comment: null
      }));

      await expect(service.createComment({
        issueId: 'TEST-1',
        body: 'Test comment'
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to create comment')
      );
    });
  });

  describe('data cleaning', () => {
    test('extracts mentions from text', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Related to TEST-2 and TEST-3. CC @john and @jane',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.mentionedIssues).toEqual(['TEST-2', 'TEST-3']);
      expect(result.mentionedUsers).toEqual(['john', 'jane']);
    });

    test('cleans markdown from description', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: '# Heading\n**Bold** and _italic_ text with `code`\n[Link](https://example.com)',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(null),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.description).toBe('Bold and italic text with code Link');
    });
  });
});
