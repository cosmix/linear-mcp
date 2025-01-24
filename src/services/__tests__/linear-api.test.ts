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
      issues: issuesFn,
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
    test('returns formatted issue when found', async () => {
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
      });
      expect(issueFn).toHaveBeenCalledWith('TEST-1');
    });

    test('throws McpError when issue not found', async () => {
      issueFn.mockImplementation(async () => null);

      await expect(service.getIssue({ issueId: 'NONEXISTENT' }))
        .rejects
        .toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: NONEXISTENT'));
    });
  });

  describe('searchIssues', () => {
    test('returns formatted search results', async () => {
      const testIssues = {
        nodes: [
          {
            id: 'issue-1',
            identifier: 'TEST-1',
            title: 'Test Issue 1',
            priority: 1,
            state: Promise.resolve({ name: 'In Progress' }),
            assignee: Promise.resolve({ name: 'John Doe' }),
          },
          {
            id: 'issue-2',
            identifier: 'TEST-2',
            title: 'Test Issue 2',
            priority: 2,
            state: Promise.resolve({ name: 'Todo' }),
            assignee: Promise.resolve(undefined),
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
        },
        {
          id: 'issue-2',
          identifier: 'TEST-2',
          title: 'Test Issue 2',
          status: 'Todo',
          assignee: undefined,
          priority: 2,
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
});
