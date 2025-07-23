import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearAPIService } from '../linear/index.js';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Cycle Filtering', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('searchIssues with cycle filtering', () => {
    test('filters issues by current cycle', async () => {
      // Mock team data
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-current',
              number: 1,
              name: 'Current Cycle',
              startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
              completedAt: null,
              isActive: true
            },
            {
              id: 'cycle-next',
              number: 2,
              name: 'Next Cycle',
              startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              endsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),   // 28 days from now
              completedAt: null,
              isActive: false
            },
            {
              id: 'cycle-previous',
              number: 0,
              name: 'Previous Cycle',
              startsAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
              endsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),   // 14 days ago
              completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              isActive: false
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Mock issues response
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

      // Test filtering by current cycle
      await service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'current',
            teamId: 'team-123'
          }
        }
      });

      // Verify the correct filter was applied
      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            cycle: {
              id: { eq: 'cycle-current' }
            }
          }]
        }
      });
    });

    test('filters issues by next cycle', async () => {
      // Mock team data
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-current',
              number: 1,
              name: 'Current Cycle',
              startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
              completedAt: null,
              isActive: true
            },
            {
              id: 'cycle-next',
              number: 2,
              name: 'Next Cycle',
              startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              endsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),   // 28 days from now
              completedAt: null,
              isActive: false
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Mock issues response
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

      // Test filtering by next cycle
      await service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'next',
            teamId: 'team-123'
          }
        }
      });

      // Verify the correct filter was applied
      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            cycle: {
              id: { eq: 'cycle-next' }
            }
          }]
        }
      });
    });

    test('filters issues by previous cycle', async () => {
      // Mock team data
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-current',
              number: 1,
              name: 'Current Cycle',
              startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
              completedAt: null,
              isActive: true
            },
            {
              id: 'cycle-previous',
              number: 0,
              name: 'Previous Cycle',
              startsAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
              endsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),   // 14 days ago
              completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              isActive: false
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Mock issues response
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

      // Test filtering by previous cycle
      await service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'previous',
            teamId: 'team-123'
          }
        }
      });

      // Verify the correct filter was applied
      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            cycle: {
              id: { eq: 'cycle-previous' }
            }
          }]
        }
      });
    });

    test('filters issues by specific cycle', async () => {
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

      const mockCycles = {
        nodes: [
          {
            id: 'cycle-1',
            number: 1,
            name: 'Cycle 1',
            startsAt: new Date('2025-01-01'),
            endsAt: new Date('2025-01-14'),
          },
          {
            id: 'cycle-2', 
            number: 2,
            name: 'Cycle 2',
            startsAt: new Date('2025-01-15'),
            endsAt: new Date('2025-01-28'),
          }
        ]
      };

      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        cycles: () => Promise.resolve(mockCycles)
      };

      mockClient.issues.mockImplementation(async () => testIssues);
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      await service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'specific',
            teamId: 'team-123',
            id: '2'  // Should be string ID, not cycleNumber
          }
        }
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          and: [{
            cycle: {
              id: { eq: 'cycle-2' }
            }
          }]
        }
      });
    });

    test('combines cycle filter with other filters', async () => {
      // Mock team data
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-current',
              number: 1,
              name: 'Current Cycle',
              startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
              completedAt: null,
              isActive: true
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Mock issues response
      const testIssues = {
        nodes: [{
          id: 'issue-1',
          identifier: 'TEST-1',
          title: 'Test Issue',
          priority: 2,
          state: Promise.resolve({ name: 'In Progress' }),
          assignee: Promise.resolve({ name: 'Current User' }),
          team: Promise.resolve({ name: 'Engineering' }),
          labels: () => Promise.resolve({ nodes: [] }),
        }],
      };
      mockClient.issues.mockImplementation(async () => testIssues);

      // Test combining cycle filter with other filters
      await service.searchIssues({
        query: 'bug',
        filter: {
          and: [
            {
              priority: { gte: 2 }
            }
          ],
          cycle: {
            type: 'current',
            teamId: 'team-123'
          },
          assignee: {
            id: { eq: 'me' }
          }
        }
      });

      // Verify that the filter contains the expected components
      const callArgs = mockClient.issues.mock.calls[0][0];
      expect(callArgs).toBeDefined();
      expect(callArgs.filter).toBeDefined();
      expect(callArgs.filter.and).toBeDefined();
      
      // Check that the filter contains the cycle condition
      const cycleCondition = callArgs.filter.and.find(
        (cond: any) => cond.cycle && cond.cycle.id && cond.cycle.id.eq === 'cycle-current'
      );
      expect(cycleCondition).toBeDefined();
      
      // Check that the filter contains the priority condition
      const priorityCondition = callArgs.filter.and.find(
        (cond: any) => cond.and && cond.and.some((c: any) => c.priority && c.priority.gte === 2)
      );
      expect(priorityCondition).toBeDefined();
      
      // Check that the filter contains the assignee condition
      const assigneeCondition = callArgs.filter.and.find(
        (cond: any) => cond.assignee && cond.assignee.id && cond.assignee.id.eq === 'current-user'
      );
      expect(assigneeCondition).toBeDefined();
      
      // Check that the filter contains the search query condition
      const queryCondition = callArgs.filter.and.find(
        (cond: any) => cond.or && cond.or.some((c: any) => c.title && c.title.contains === 'bug')
      );
      expect(queryCondition).toBeDefined();
    });

    test('handles error when team not found', async () => {
      // Mock empty teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: []
      }));

      // Test with non-existent team
      await expect(service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'current',
            teamId: 'nonexistent-team'
          }
        }
      })).rejects.toThrow(/Team not found: nonexistent-team/);
    });

    test('handles error when no cycles found', async () => {
      // Mock team with no cycles
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: []
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Test with team that has no cycles
      await expect(service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'current',
            teamId: 'team-123'
          }
        }
      })).rejects.toThrow(/No cycles found for team team-123/);
    });

    test('handles error when no active cycle found', async () => {
      // Mock team with no active cycles
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-next',
              number: 2,
              name: 'Next Cycle',
              startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              endsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),   // 28 days from now
              completedAt: null,
              isActive: false
            },
            {
              id: 'cycle-previous',
              number: 0,
              name: 'Previous Cycle',
              startsAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
              endsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),   // 14 days ago
              completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              isActive: false
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Test with team that has no active cycle
      await expect(service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'current',
            teamId: 'team-123'
          }
        }
      })).rejects.toThrow(/No active cycle found for team team-123/);
    });

    test('handles error when no upcoming cycles found', async () => {
      // Mock team with no upcoming cycles
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-current',
              number: 1,
              name: 'Current Cycle',
              startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
              completedAt: null,
              isActive: true
            },
            {
              id: 'cycle-previous',
              number: 0,
              name: 'Previous Cycle',
              startsAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
              endsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),   // 14 days ago
              completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              isActive: false
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Test with team that has no upcoming cycles
      await expect(service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'next',
            teamId: 'team-123'
          }
        }
      })).rejects.toThrow(/No upcoming cycles found for team team-123/);
    });

    test('handles error when no completed cycles found', async () => {
      // Mock team with no completed cycles
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        cycles: () => Promise.resolve({
          nodes: [
            {
              id: 'cycle-current',
              number: 1,
              name: 'Current Cycle',
              startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days from now
              completedAt: null,
              isActive: true
            },
            {
              id: 'cycle-next',
              number: 2,
              name: 'Next Cycle',
              startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              endsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),   // 28 days from now
              completedAt: null,
              isActive: false
            }
          ]
        })
      };

      // Mock teams response
      mockClient.teams.mockImplementation(async () => ({
        nodes: [mockTeam]
      }));

      // Test with team that has no completed cycles
      await expect(service.searchIssues({
        query: '',
        filter: {
          cycle: {
            type: 'previous',
            teamId: 'team-123'
          }
        }
      })).rejects.toThrow(/No completed cycles found for team team-123/);
    });
  });
});
