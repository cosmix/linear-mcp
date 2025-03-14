import { mock } from 'bun:test';
import { LinearClientInterface } from '../linear-api';

/**
 * Creates a mock Linear client with all required methods and properties
 * for testing the LinearAPIService.
 */
export function createMockLinearClient(): LinearClientInterface {
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

  // Create mock functions for the client
  const issueFn = mock(() => Promise.resolve(null));
  const issuesFn = mock(() => Promise.resolve({ nodes: [] }));
  const createIssueFn = mock(() => Promise.resolve({ success: true, issue: null }));
  const teamsFn = mock(() => Promise.resolve({ nodes: [] }));
  const projectsFn = mock(() => Promise.resolve({ 
    nodes: [],
    pageInfo: { hasNextPage: false, endCursor: null }
  }));
  const projectFn = mock(() => Promise.resolve(null));
  
  // Create request mock function
  const requestFn = mock(() => Promise.resolve(null));
  
  // Create mock client with properly typed mocks, using 'as any' for Linear SDK compatibility
  const mockClient = {
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
    deleteIssue: mock(() => Promise.resolve()) as any,
    project: projectFn as any,
    projects: projectsFn as any,
    _request: requestFn as any
  };

  return mockClient;
}
