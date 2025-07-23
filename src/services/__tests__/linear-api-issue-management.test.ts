import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { LinearAPIService } from '../linear/index.js';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Issue Management', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  // Helper to create a mock issue object for update/delete tests
  const createMockIssueForUpdate = (updates: Record<string, any> = {}) => ({
    id: 'issue-1',
    identifier: 'TEST-1',
    title: 'Original Title',
    description: 'Original Description',
    priority: 1,
    createdAt: new Date('2025-01-24'),
    updatedAt: new Date('2025-01-24'),
    state: Promise.resolve({ id: 'state-1', name: 'Backlog' }),
    assignee: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
    team: Promise.resolve({
      id: 'team-1',
      name: 'Engineering',
      // Mock the team.states() method needed for status resolution
      states: mock(() => Promise.resolve({
        nodes: [
          { id: 'state-1', name: 'Backlog' },
          { id: 'state-2', name: 'Todo' },
          { id: 'state-3', name: 'In Progress' },
          { id: 'state-4', name: 'Done' },
        ]
      }))
    }),
    creator: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
    labels: () => Promise.resolve({ nodes: [] }),
    parent: Promise.resolve(undefined),
    children: () => Promise.resolve({ nodes: [] }),
    relations: () => Promise.resolve({ nodes: [] }),
    update: mock(() => Promise.resolve()), // Mock the SDK update function
    delete: mock(() => Promise.resolve()), // Mock the SDK delete function
    ...updates // Allow overriding defaults for simulating post-update state
  });


  // --- createIssue Tests ---
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
      // Mock the getIssue call that happens after creation
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
        labelIds: undefined,
        projectId: undefined
      });

      // Check the formatted result from getIssue
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
        assignee: Promise.resolve({ name: 'Current User' }), // Assignee set after creation
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Current User' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.createIssue.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue // Return the base issue object
      }));
      mockClient.issue.mockImplementation(async () => mockCreatedIssue); // Mock getIssue

      await service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        assigneeId: 'me'
      });

      // Check the payload sent to the SDK createIssue
      expect(mockClient.createIssue).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: 'current-user', // Expect resolved ID
        parentId: undefined,
        labelIds: undefined,
        projectId: undefined
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
        parent: Promise.resolve(mockParent), // Link parent
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      // Mock client.issue to return parent or child based on ID
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
        parentId: 'TEST-1' // Use parent identifier
      });

      // Check SDK createIssue payload
      expect(mockClient.createIssue).toHaveBeenCalledWith({
        teamId: 'team-1', // Inherited from parent
        title: 'Child Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: undefined,
        parentId: 'TEST-1', // Passed correctly
        labelIds: undefined,
        projectId: undefined
      });

      // Check the formatted result from getIssue
      expect(result.parent).toEqual({
        id: 'parent-1',
        identifier: 'TEST-1',
        title: 'Parent Issue'
      });
      // Check relationships derived by getRelationships util
      expect(result.relationships).toContainEqual({
        type: 'parent',
        issueId: 'parent-1',
        identifier: 'TEST-1',
        title: 'Parent Issue'
      });
    });

    test('throws error when parent issue not found', async () => {
      mockClient.issue.mockImplementation(async () => undefined); // Parent not found

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
        issue: undefined // Simulate SDK failure
      }));

      await expect(service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue'
      })).rejects.toThrow('MCP error -32603: Failed to create issue: No issue returned');
    });

    test('creates issue with projectId', async () => {
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
      // Mock the getIssue call that happens after creation
      mockClient.issue.mockImplementation(async () => mockCreatedIssue);

      const result = await service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        projectId: 'project-123'
      });

      expect(mockClient.createIssue).toHaveBeenCalledWith({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        priority: undefined,
        assigneeId: undefined,
        parentId: undefined,
        labelIds: undefined,
        projectId: 'project-123'
      });

      expect(result.id).toBe('issue-1');
      expect(result.identifier).toBe('TEST-1');
    });
  });

  // --- updateIssue Tests ---
  describe('updateIssue', () => {
    test('updates issue title and description', async () => {
      const mockIssue = createMockIssueForUpdate({
        // Simulate the state *after* the update for the subsequent getIssue call
        title: 'Updated Title',
        description: 'Updated Description',
      });
      mockClient.issue.mockImplementation(async () => mockIssue);

      // Call the service method
      const result = await service.updateIssue({
        issueId: 'TEST-1',
        title: 'Updated Title',
        description: 'Updated Description',
      });

      // Verify the update payload passed to the mock SDK
      expect(mockIssue.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'Updated Description',
      });

      // Verify the structure of the returned result (from getIssue)
      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      // Other fields should reflect the state *after* update (as mocked)
      expect(result.status).toBe('Backlog'); // Status wasn't updated in this call
      expect(result.assignee).toBe('John Doe'); // Assignee wasn't updated
      expect(result.priority).toBe(1); // Priority wasn't updated
    });

    test('updates issue with self-assignment', async () => {
      const mockIssue = createMockIssueForUpdate({
        // Simulate assignee after update for getIssue call
        assignee: Promise.resolve({ id: 'current-user', name: 'Current User' }),
      });
      mockClient.issue.mockImplementation(async () => mockIssue);

      await service.updateIssue({
        issueId: 'TEST-1',
        assigneeId: 'me'
      });

      // Check the payload sent to SDK update
      expect(mockIssue.update).toHaveBeenCalledWith({
        assigneeId: 'current-user' // Expect resolved ID
      });
    });

    test('updates issue with partial fields (labels)', async () => {
      const mockIssue = createMockIssueForUpdate({
        // Simulate labels after update
        labels: () => Promise.resolve({ nodes: [{ name: 'bug' }, { name: 'prio:high' }] }),
      });
      mockClient.issue.mockImplementation(async () => mockIssue);

      const result = await service.updateIssue({
        issueId: 'TEST-1',
        labelIds: ['label-bug-id', 'label-prio-id']
      });

      // Check SDK update payload
      expect(mockIssue.update).toHaveBeenCalledWith({
        labelIds: ['label-bug-id', 'label-prio-id']
      });

      // Check formatted result
      expect(result.labels).toEqual(['bug', 'prio:high']);
      expect(result.title).toBe('Original Title'); // Check other fields remain
    });

    // --- Tests for Status Resolution ---

    test('updates issue status with valid name', async () => {
      const mockIssue = createMockIssueForUpdate({
        // Simulate state after update for getIssue call
        state: Promise.resolve({ id: 'state-3', name: 'In Progress' }),
      });
      mockClient.issue.mockImplementation(async () => mockIssue);

      const result = await service.updateIssue({
        issueId: 'TEST-1',
        status: 'In Progress', // Use status name
      });

      // Expect update payload to use stateId
      expect(mockIssue.update).toHaveBeenCalledWith({
        stateId: 'state-3',
      });
      // Check formatted result
      expect(result.status).toBe('In Progress');
    });

    test('updates issue status with valid name (case-insensitive)', async () => {
      const mockIssue = createMockIssueForUpdate({
        state: Promise.resolve({ id: 'state-3', name: 'In Progress' }),
      });
      mockClient.issue.mockImplementation(async () => mockIssue);

      await service.updateIssue({ issueId: 'TEST-1', status: 'in progress' }); // Lowercase

      // Check SDK payload
      expect(mockIssue.update).toHaveBeenCalledWith({ stateId: 'state-3' });
    });

    test('throws error for invalid status name', async () => {
      const mockIssue = createMockIssueForUpdate();
      mockClient.issue.mockImplementation(async () => mockIssue);

      // Expect specific error for invalid status
      await expect(service.updateIssue({
        issueId: 'TEST-1',
        status: 'NonExistentStatus',
      })).rejects.toThrow( // Match only the message string
        'Invalid status name "NonExistentStatus" for team "Engineering". Valid statuses are: Backlog, Todo, In Progress, Done'
      );
      // Ensure SDK update was not called
      expect(mockIssue.update).not.toHaveBeenCalled();
    });

    // --- Tests for Priority Validation ---

    test('updates issue priority with valid value (0)', async () => {
      const mockIssue = createMockIssueForUpdate({ priority: 0 }); // Simulate state after update
      mockClient.issue.mockImplementation(async () => mockIssue);

      const result = await service.updateIssue({ issueId: 'TEST-1', priority: 0 });

      // Check SDK payload
      expect(mockIssue.update).toHaveBeenCalledWith({ priority: 0 });
      // Check formatted result
      expect(result.priority).toBe(0);
    });

    test('updates issue priority with valid value (4)', async () => {
      const mockIssue = createMockIssueForUpdate({ priority: 4 }); // Simulate state after update
      mockClient.issue.mockImplementation(async () => mockIssue);

      const result = await service.updateIssue({ issueId: 'TEST-1', priority: 4 });

      // Check SDK payload
      expect(mockIssue.update).toHaveBeenCalledWith({ priority: 4 });
      // Check formatted result
      expect(result.priority).toBe(4);
    });

    test('throws error for priority value below range (-1)', async () => {
      const mockIssue = createMockIssueForUpdate();
      mockClient.issue.mockImplementation(async () => mockIssue);

      // Expect specific error for invalid priority
      await expect(service.updateIssue({
        issueId: 'TEST-1',
        priority: -1,
      })).rejects.toThrow( // Match only the message string
        'Invalid priority value "-1". Priority must be between 0 (No priority) and 4 (Low).'
      );
      // Ensure SDK update was not called
      expect(mockIssue.update).not.toHaveBeenCalled();
    });

    test('throws error for priority value above range (5)', async () => {
      const mockIssue = createMockIssueForUpdate();
      mockClient.issue.mockImplementation(async () => mockIssue);

      // Expect specific error for invalid priority
      await expect(service.updateIssue({
        issueId: 'TEST-1',
        priority: 5,
      })).rejects.toThrow( // Match only the message string
        'Invalid priority value "5". Priority must be between 0 (No priority) and 4 (Low).'
      );
      // Ensure SDK update was not called
      expect(mockIssue.update).not.toHaveBeenCalled();
    });

    // --- General Error Handling Tests ---

    test('throws error when issue not found for update', async () => {
      mockClient.issue.mockImplementation(async () => undefined); // Issue not found

      await expect(service.updateIssue({
        issueId: 'NONEXISTENT',
        title: 'Updated Title'
      })).rejects.toThrow( // Check the wrapper error message
        'MCP error -32603: Failed to update issue: MCP error -32600: Issue not found: NONEXISTENT'
      );
    });

    test('throws error when SDK update fails', async () => {
      const mockIssue = createMockIssueForUpdate();
      // Simulate SDK update rejection
      mockIssue.update.mockImplementation(() => Promise.reject(new Error('SDK Update failed')));
      mockClient.issue.mockImplementation(async () => mockIssue);

      await expect(service.updateIssue({
        issueId: 'TEST-1',
        title: 'Updated Title'
      })).rejects.toThrow( // Check the wrapper error message
        new McpError(ErrorCode.InternalError, 'Failed to update issue: SDK Update failed')
      );
    });
  });

  // --- deleteIssue Tests ---
  describe('deleteIssue', () => {
    test('deletes issue successfully', async () => {
      const mockIssue = createMockIssueForUpdate(); // Use helper
      mockClient.issue.mockImplementation(async () => mockIssue);

      await service.deleteIssue({ issueId: 'TEST-1' });
      // Verify SDK delete was called
      expect(mockIssue.delete).toHaveBeenCalled();
    });

    test('throws error when issue not found for delete', async () => {
      mockClient.issue.mockImplementation(async () => null); // Issue not found

      await expect(service.deleteIssue({ issueId: 'NONEXISTENT' }))
        .rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: NONEXISTENT'));
    });

    test('handles API errors gracefully during delete', async () => {
      const mockIssue = createMockIssueForUpdate();
      // Simulate SDK delete failure
      mockIssue.delete.mockImplementation(() => Promise.reject(new Error('API error')));
      mockClient.issue.mockImplementation(async () => mockIssue);

      await expect(service.deleteIssue({ issueId: 'TEST-1' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'Failed to delete issue: API error'));
    });
  });
});
