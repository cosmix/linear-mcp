import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LinearAPIService, LinearClientInterface } from '../linear-api';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService', () => {
  let service: LinearAPIService;
  let mockClient: LinearClientInterface;
  let issueFn: ReturnType<typeof mock>;
  let issuesFn: ReturnType<typeof mock>;

  beforeEach(() => {
    // Setup mocks
    issueFn = mock(() => Promise.resolve(null));
    issuesFn = mock(() => Promise.resolve({ nodes: [] }));
    
    // Create mock client
    mockClient = {
      issue: issueFn,
      issues: issuesFn
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
