import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearBaseService } from '../linear/base-service';
import { createMockLinearClient } from './test-utils';

// Create a concrete implementation to test the abstract base class
class TestLinearService extends LinearBaseService {
  async testGetCurrentUser() {
    return this.getCurrentUser();
  }
}

describe('LinearBaseService', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
  });

  describe('constructor', () => {
    test('creates instance with API key string', () => {
      const service = new TestLinearService('test-api-key');
      expect(service).toBeInstanceOf(LinearBaseService);
      expect(service).toBeDefined();
    });

    test('creates instance with client interface', () => {
      const service = new TestLinearService(mockClient);
      expect(service).toBeInstanceOf(LinearBaseService);
      expect(service).toBeDefined();
    });

    test('throws error when API key is empty string', () => {
      expect(() => new TestLinearService('')).toThrow('LINEAR_API_KEY is required');
    });

    test('accepts null as client interface', () => {
      const service = new TestLinearService(null as any);
      expect(service).toBeInstanceOf(LinearBaseService);
      expect((service as any).client).toBe(null);
    });

    test('accepts undefined as client interface', () => {
      const service = new TestLinearService(undefined as any);
      expect(service).toBeInstanceOf(LinearBaseService);
      expect((service as any).client).toBe(undefined);
    });
  });

  describe('getCurrentUser', () => {
    test('returns formatted current user information', async () => {
      const service = new TestLinearService(mockClient);
      
      const result = await service.testGetCurrentUser();

      expect(result).toEqual({
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com'
      });
    });

    test('handles viewer with minimal data', async () => {
      const minimalViewer = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        // Mock other required properties with minimal data
        active: true,
        admin: false,
        avatarUrl: undefined,
        avatarBackgroundColor: '#000000',
        createdAt: new Date(),
        displayName: 'Test User',
        inviteHash: 'hash',
        lastSeen: new Date(),
        organizationId: 'org-1',
        updatedAt: new Date(),
        url: 'https://linear.app/user/test',
        // Mock remaining properties
        createdIssueCount: 0,
        guest: false,
        initials: 'TU',
        isMe: false,
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
        timezone: 'UTC',
        statusLabel: '',
        // Mock async properties
        organization: Promise.resolve({} as any),
        status: Promise.resolve({} as any),
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

      const customMockClient = {
        ...mockClient,
        viewer: Promise.resolve(minimalViewer)
      };

      const service = new TestLinearService(customMockClient);
      
      const result = await service.testGetCurrentUser();

      expect(result).toEqual({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com'
      });
    });
  });
});