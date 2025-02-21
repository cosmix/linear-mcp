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
  let viewerFn: ReturnType<typeof mock>;

  beforeEach(() => {
    // Setup mocks
    issueFn = mock(() => Promise.resolve(null));
    issuesFn = mock(() => Promise.resolve({ nodes: [] }));
    createIssueFn = mock(() => Promise.resolve({ success: true, issue: null }));
    teamsFn = mock(() => Promise.resolve({ nodes: [] }));
    // Create a properly typed mock viewer that matches Linear SDK's User type
    const mockViewer = {
      id: 'current-user',
      name: 'Current User',
      email: 'current@example.com',
      active: true,
      admin: false,
      avatarUrl: undefined,
      avatarBackgroundColor: '#000000',
      createdAt: new Date('2025-01-24'),
      displayName: 'Current User',
      inviteHash: 'invite-hash',
      lastSeen: new Date('2025-01-24'),
      organization: Promise.resolve({
        id: 'org-1',
        name: 'Test Organization',
        urlKey: 'test-org',
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        initiativeUpdateRemindersDay: 1,
        projectUpdateRemindersDay: 1,
        projectUpdatesReminderFrequency: 'weekly',
        releaseChannel: 'stable',
        gitBranchFormat: '',
        periodUploadVolume: 0,
        trialEndsAt: null,
        userCount: 1,
        createdIssueCount: 0,
        logo: undefined,
        periodStartDate: new Date('2025-01-24'),
        subscription: undefined,
        samlEnabled: false,
        scimEnabled: false,
        deletionRequestedAt: undefined,
        roadmapEnabled: false,
        issueVoteEnabled: false,
        roadmapAccessEnabled: false,
        customersConfiguration: undefined,
        customersEnabled: false,
        fiscalYearStartMonth: 1,
        gitLinkbackMessagesEnabled: false,
        gitPublicLinkbackMessagesEnabled: false,
        integrationsSettings: {},
        linearPreviewEnabled: false,
        projectUpdateRemindersEnabled: false,
        projectUpdatesEnabled: false,
        publicSignupEnabled: false,
        releasesEnabled: false,
        requireProjectLead: false,
        requireStateCategory: false,
        slackAsksEnabled: false,
        slackEnabled: false,
        slackIssueCreatedEnabled: false,
        slackIssueNewEnabled: false,
        slackIssueStatusChangedEnabled: false,
        slackIssueStatusDoneEnabled: false,
        slackIssueStatusInProgressEnabled: false,
        slackIssueStatusTodoEnabled: false,
        slackProjectUpdateEnabled: false,
        slackRequestEnabled: false,
        initiativeUpdateRemindersHour: 9,
        previousUrlKeys: [],
        projectUpdateRemindersHour: 9,
        projectStatuses: [],
        projectTeamIds: [],
        projectTemplateIds: [],
        projectUpdateTemplates: [],
        projectUpdatesRemindersDayOfWeek: 1,
        projectUpdatesRemindersEnabled: false,
        projectUpdatesRemindersHour: 9,
        projectUpdatesRemindersPeriod: 'weekly',
        projectUpdatesRemindersTimezone: 'UTC',
        webhookUrl: undefined,
        _request: () => Promise.resolve({}),
        paginate: () => Promise.resolve({ nodes: [] })
      }),
      organizationId: 'org-1',
      status: Promise.resolve({
        id: 'status-1',
        label: 'Available',
        type: 'available',
        emoji: '✅',
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        _request: () => Promise.resolve({}),
        paginate: () => Promise.resolve({ nodes: [] })
      }),
      statusLabel: '',
      timezone: 'UTC',
      updatedAt: new Date('2025-01-24'),
      url: 'https://linear.app/user/current-user',
      createdIssueCount: 0,
      guest: false,
      initials: 'CU',
      isMe: true,
      description: undefined,
      calendarHash: undefined,
      disableReason: undefined,
      archivedAt: undefined,
      markedAsDuplicateAt: undefined,
      dueDate: undefined,
      estimate: undefined,
      identifier: 'USER-1',
      autoArchivedAt: undefined,
      canceledAt: undefined,
      completedAt: undefined,
      customerTicketCount: 0,
      assignedIssuesCount: 0,
      issueCreatedCount: 0,
      issueClosedCount: 0,
      allowAttachments: true,
      allowExternalUserInvites: true,
      allowGitHubIntegration: true,
      allowSlackIntegration: true,
      allowSsoLogin: true,
      archivedIssuesCount: 0,
      openIssuesCount: 0,
      totalIssuesCount: 0,
      totalTimeSpent: 0,
      settings: {},
      // Add required LinearFetch properties
      assignedIssues: Promise.resolve({ nodes: [] }),
      createdIssues: Promise.resolve({ nodes: [] }),
      drafts: Promise.resolve({ nodes: [] }),
      teamMemberships: Promise.resolve({ nodes: [] }),
      teams: Promise.resolve({ nodes: [] }),
      workflowStates: Promise.resolve({ nodes: [] }),
      projectMemberships: Promise.resolve({ nodes: [] }),
      favoriteProjects: Promise.resolve({ nodes: [] }),
      favoriteIssues: Promise.resolve({ nodes: [] }),
      favoriteDocuments: Promise.resolve({ nodes: [] }),
      suspend: () => Promise.resolve(true),
      unsuspend: () => Promise.resolve(true),
      update: () => Promise.resolve(true),
      _request: () => Promise.resolve({}),
      paginate: () => Promise.resolve({ nodes: [] })
    };
    
    // Create mock client with properly typed mocks, using 'as any' for Linear SDK compatibility
    mockClient = {
      issue: issueFn as any,
      issues: issuesFn as any,
      createIssue: createIssueFn as any,
      teams: teamsFn as any,
      createComment: mock(() => Promise.resolve({
        success: true,
        comment: null,
        _comment: null,
        lastSyncId: '1',
        _request: () => Promise.resolve({}),
        paginate: () => Promise.resolve({ nodes: [] })
      })) as any,
      viewer: Promise.resolve(mockViewer) as any,
      deleteIssue: mock(() => Promise.resolve()) as any
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

  describe('getCurrentUser', () => {
    test('returns current user information', async () => {
      const result = await (service as any).getCurrentUser();
      expect(result).toEqual({
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com'
      });
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
        assignee: Promise.resolve(undefined),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'John Doe' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
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

      createIssueFn.mockImplementation(async () => ({
        success: true,
        issue: mockCreatedIssue
      }));
      issueFn.mockImplementation(async () => mockCreatedIssue);

      await service.createIssue({
        teamId: 'team-1',
        title: 'Test Issue',
        description: 'Test Description',
        assigneeId: 'me'
      });

      expect(createIssueFn).toHaveBeenCalledWith({
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

      issueFn.mockImplementation(async (id) => {
        if (id === 'parent-1' || id === 'TEST-1') return mockParent;
        if (id === 'issue-2' || id === 'TEST-2') return mockCreatedIssue;
        return undefined;
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
      issueFn.mockImplementation(async () => undefined);

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

      issueFn.mockImplementation(async () => mockUpdatedIssue);

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
      issueFn.mockImplementation(async () => undefined);

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

      issuesFn.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: '',
        filter: { assignedTo: 'me' }
      });

      expect(issuesFn).toHaveBeenCalledWith({
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

      issuesFn.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: '',
        filter: { createdBy: 'me' }
      });

      expect(issuesFn).toHaveBeenCalledWith({
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

      issuesFn.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: 'bug',
        filter: {
          assignedTo: 'me',
          createdBy: 'me'
        }
      });

      expect(issuesFn).toHaveBeenCalledWith({
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

    test('uses specific user ID for filtering', async () => {
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

      issuesFn.mockImplementation(async () => testIssues);

      await service.searchIssues({
        query: '',
        filter: {
          assignedTo: 'user-123',
          createdBy: 'user-456'
        }
      });

      expect(issuesFn).toHaveBeenCalledWith({
        filter: {
          and: [
            {
              assignee: {
                id: { eq: 'user-123' }
              }
            },
            {
              creator: {
                id: { eq: 'user-456' }
              }
            }
          ]
        }
      });
    });

    test('returns empty array when no results found', async () => {
      issuesFn.mockImplementation(async () => ({ nodes: [] }));

      const results = await service.searchIssues({ query: 'nonexistent' });

      expect(results).toEqual([]);
      expect(issuesFn).toHaveBeenCalled();
    });

    test('handles API errors gracefully', async () => {
      issuesFn.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.searchIssues({ query: 'test' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'API error'));
    });

    test('handles empty/invalid search queries', async () => {
      // Empty query should work
      await service.searchIssues({ query: '' });
      expect(issuesFn).toHaveBeenCalledWith({ filter: undefined });

      // Whitespace query should be trimmed
      await service.searchIssues({ query: '   ' });
      expect(issuesFn).toHaveBeenCalledWith({ filter: undefined });
    });

    test('handles null/undefined filter values', async () => {
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 1,
          state: Promise.resolve(null),
          assignee: Promise.resolve(undefined),
          team: Promise.resolve(null),
          labels: () => Promise.resolve({ nodes: [] })
        }]
      };

      issuesFn.mockImplementation(async () => testIssues);

      const result = await service.searchIssues({
        query: 'test',
        filter: {
          assignedTo: undefined,
          createdBy: undefined
        }
      });

      expect(result).toEqual([{
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        status: undefined,
        assignee: undefined,
        priority: 1,
        teamName: undefined,
        labels: []
      }]);

      // Should not include undefined filters in the query
      expect(issuesFn).toHaveBeenCalledWith({
        filter: {
          and: [{
            or: [
              { title: { contains: 'test' } },
              { description: { contains: 'test' } },
            ]
          }]
        }
      });
    });
  });

  describe('getTeams', () => {
    test('handles empty teams list', async () => {
      teamsFn.mockImplementation(async () => ({ nodes: [] }));
      const result = await service.getTeams({});
      expect(result).toEqual([]);
    });

    test('returns all teams when no filter provided', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});

      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
        { id: 'team-2', name: 'Design', key: 'DES', description: undefined }
      ]);
    });

    test('performs case-insensitive name filtering', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null },
          { id: 'team-3', name: 'QA TEAM', key: 'QA', description: 'Quality Assurance' }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      // Test lowercase filter
      let result = await service.getTeams({ nameFilter: 'engineering' });
      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' }
      ]);

      // Test uppercase filter
      result = await service.getTeams({ nameFilter: 'DESIGN' });
      expect(result).toEqual([
        { id: 'team-2', name: 'Design', key: 'DES', description: undefined }
      ]);

      // Test mixed case filter
      result = await service.getTeams({ nameFilter: 'Qa' });
      expect(result).toEqual([
        { id: 'team-3', name: 'QA TEAM', key: 'QA', description: 'Quality Assurance' }
      ]);
    });

    test('filters teams by name', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({ nameFilter: 'eng' });

      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' }
      ]);
    });

    test('filters teams by key', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({ nameFilter: 'des' });

      expect(result).toEqual([
        { id: 'team-2', name: 'Design', key: 'DES', description: undefined }
      ]);
    });

    test('handles missing or invalid team fields', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: '', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: '', description: null },
          { id: 'team-3', name: '', key: '', description: undefined }
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});
      expect(result).toEqual([
        { id: 'team-1', name: '', key: 'ENG', description: 'Engineering team' },
        { id: 'team-2', name: 'Design', key: '', description: undefined },
        { id: 'team-3', name: '', key: '', description: undefined }
      ]);
    });

    test('handles malformed team data', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: '', key: '' }, // Empty required fields
          { id: 'team-2', name: 'Design', key: '' }, // Missing key
          { id: 'team-3', name: '', key: 'QA' }, // Missing name
          null, // Null team
          undefined, // Undefined team
          {} // Empty team
        ]
      };

      teamsFn.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});
      expect(result).toEqual([
        { id: 'team-1', name: '', key: '', description: undefined },
        { id: 'team-2', name: 'Design', key: '', description: undefined },
        { id: 'team-3', name: '', key: 'QA', description: undefined }
      ]);
    });

    test('handles API errors', async () => {
      teamsFn.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.getTeams({})).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to fetch teams: API error')
      );
    });
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

      issueFn.mockImplementation(async () => ({ id: 'issue-1' }));
      (mockClient.createComment as any).mockImplementation(async () => ({
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
      issueFn.mockImplementation(async () => null);

      await expect(service.createComment({
        issueId: 'NONEXISTENT',
        body: 'Test comment'
      })).rejects.toThrow(
        'MCP error -32603: Failed to create comment: MCP error -32600: Issue not found: NONEXISTENT'
      );

      expect(mockClient.createComment).not.toHaveBeenCalled();
    });

    test('throws error when comment creation fails', async () => {
      issueFn.mockImplementation(async () => ({ id: 'issue-1' }));
      (mockClient.createComment as any).mockImplementation(async () => ({
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

      issueFn.mockImplementation(async () => mockIssue);

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
      issueFn.mockImplementation(async () => null);

      await expect(service.getIssue({ issueId: 'INVALID' }))
        .rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: INVALID'));
    });

    test('handles API errors gracefully', async () => {
      issueFn.mockImplementation(async () => {
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

      issueFn.mockImplementation(async () => mockIssue);

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

  describe('data cleaning', () => {
    test('extracts multiple issue mentions from text', async () => {
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
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.mentionedIssues).toEqual(['TEST-2', 'TEST-3']);
      expect(result.mentionedUsers).toEqual(['john', 'jane']);
    });

    test('extracts mentions from comments when relationships included', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Initial description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        comments: () => Promise.resolve({
          nodes: [
            {
              id: 'comment-1',
              body: 'Related to TEST-4. CC @alice',
              createdAt: new Date('2025-01-24'),
              updatedAt: new Date('2025-01-24'),
              user: Promise.resolve({ id: 'user-1', name: 'John Doe' })
            },
            {
              id: 'comment-2',
              body: 'Blocked by TEST-5. CC @bob',
              createdAt: new Date('2025-01-24'),
              updatedAt: new Date('2025-01-24'),
              user: Promise.resolve({ id: 'user-2', name: 'Jane Smith' })
            }
          ]
        })
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1', includeRelationships: true });

      expect(result.mentionedIssues).toEqual(['TEST-4', 'TEST-5']);
      expect(result.mentionedUsers).toEqual(['alice', 'bob']);
    });

    test('cleans various markdown elements from description', async () => {
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
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.description).toBe('Bold and italic text with code Link');
    });

    test('handles complex markdown formatting', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: '# Main Heading\n## Sub Heading\n- List item 1\n- List item 2\n\n> Quote here\n\n```\ncode block\n```\n\n---\n\nFinal paragraph',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.description).toBe('`` code block `` --- Final paragraph');
    });
  });

  describe('deleteIssue', () => {
    test('deletes issue successfully', async () => {
      const mockIssue = {
        id: 'issue-1',
        delete: mock(() => Promise.resolve())
      };

      issueFn.mockImplementation(async () => mockIssue);

      await service.deleteIssue({ issueId: 'TEST-1' });
      expect(mockIssue.delete).toHaveBeenCalled();
    });

    test('throws error when issue not found', async () => {
      issueFn.mockImplementation(async () => null);

      await expect(service.deleteIssue({ issueId: 'NONEXISTENT' }))
        .rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Issue not found: NONEXISTENT'));
    });

    test('handles API errors gracefully', async () => {
      const mockIssue = {
        id: 'issue-1',
        delete: mock(() => Promise.reject(new Error('API error')))
      };

      issueFn.mockImplementation(async () => mockIssue);

      await expect(service.deleteIssue({ issueId: 'TEST-1' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'Failed to delete issue: API error'));
    });
  });

  describe('relationship tracking', () => {
    test('tracks all relationship types', async () => {
      const mockParent = {
        id: 'parent-1',
        identifier: 'TEST-1',
        title: 'Parent Issue'
      };

      const mockChild = {
        id: 'child-1',
        identifier: 'TEST-3',
        title: 'Child Issue'
      };

      const mockRelated = {
        id: 'related-1',
        identifier: 'TEST-4',
        title: 'Related Issue'
      };

      const mockBlocked = {
        id: 'blocked-1',
        identifier: 'TEST-5',
        title: 'Blocked Issue'
      };

      const testIssue = {
        id: 'issue-2',
        identifier: 'TEST-2',
        title: 'Test Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(mockParent),
        children: () => Promise.resolve({ nodes: [mockChild] }),
        relations: () => Promise.resolve({
          nodes: [
            {
              type: 'related',
              relatedIssue: Promise.resolve(mockRelated)
            },
            {
              type: 'blocked',
              relatedIssue: Promise.resolve(mockBlocked)
            }
          ]
        })
      };

      issueFn.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-2' });

      expect(result.relationships).toEqual([
        {
          type: 'parent',
          issueId: 'parent-1',
          identifier: 'TEST-1',
          title: 'Parent Issue'
        },
        {
          type: 'sub',
          issueId: 'child-1',
          identifier: 'TEST-3',
          title: 'Child Issue'
        },
        {
          type: 'related',
          issueId: 'related-1',
          identifier: 'TEST-4',
          title: 'Related Issue'
        },
        {
          type: 'blocked',
          issueId: 'blocked-1',
          identifier: 'TEST-5',
          title: 'Blocked Issue'
        }
      ]);
    });
  });
});
