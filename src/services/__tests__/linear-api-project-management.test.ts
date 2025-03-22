import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ProjectUpdateHealthType } from '../../types/linear/project';
import { LinearAPIService } from '../linear/index';
import { createMockLinearClient } from './test-utils';

describe('LinearAPIService - Project Management', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('getProjects', () => {
    test('returns formatted projects list', async () => {
      const mockProjects = {
        nodes: [
          {
            id: 'project-1',
            name: 'Project Alpha',
            description: 'First test project',
            slugId: 'project-alpha',
            icon: '🚀',
            color: '#ff0000',
            state: Promise.resolve({ name: 'Active', type: 'active' }),
            creator: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
            lead: Promise.resolve({ id: 'user-2', name: 'Jane Smith' }),
            startDate: '2025-01-01',
            targetDate: '2025-06-30',
            startedAt: new Date('2025-01-01'),
            completedAt: undefined,
            canceledAt: undefined,
            progress: 0.5,
            health: 'onTrack',
            teams: () => Promise.resolve({
              nodes: [
                { id: 'team-1', name: 'Engineering', key: 'ENG' },
                { id: 'team-2', name: 'Design', key: 'DES' }
              ]
            })
          },
          {
            id: 'project-2',
            name: 'Project Beta',
            description: 'Second test project',
            slugId: 'project-beta',
            icon: '🔥',
            color: '#0000ff',
            state: Promise.resolve({ name: 'Planning', type: 'planning' }),
            creator: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
            lead: Promise.resolve(null),
            startDate: '2025-07-01',
            targetDate: '2025-12-31',
            startedAt: undefined,
            completedAt: undefined,
            canceledAt: undefined,
            progress: 0,
            health: 'onTrack',
            teams: () => Promise.resolve({
              nodes: [
                { id: 'team-1', name: 'Engineering', key: 'ENG' }
              ]
            })
          }
        ],
        pageInfo: {
          hasNextPage: true,
          endCursor: 'cursor123'
        }
      };

      mockClient.projects.mockImplementation(async () => mockProjects);

      const result = await service.getProjects({});

      expect(result).toEqual({
        projects: [
          {
            id: 'project-1',
            name: 'Project Alpha',
            description: 'First test project',
            slugId: 'project-alpha',
            icon: '🚀',
            color: '#ff0000',
            status: {
              name: 'Unknown',
              type: 'Unknown'
            },
            creator: {
              id: 'user-1',
              name: 'John Doe'
            },
            lead: {
              id: 'user-2',
              name: 'Jane Smith'
            },
            startDate: '2025-01-01',
            targetDate: '2025-06-30',
            startedAt: '2025-01-01T00:00:00.000Z',
            completedAt: undefined,
            canceledAt: undefined,
            progress: 0.5,
            health: 'onTrack',
            teams: [
              { id: 'team-1', name: 'Engineering', key: 'ENG' },
              { id: 'team-2', name: 'Design', key: 'DES' }
            ]
          },
          {
            id: 'project-2',
            name: 'Project Beta',
            description: 'Second test project',
            slugId: 'project-beta',
            icon: '🔥',
            color: '#0000ff',
            status: {
              name: 'Unknown',
              type: 'Unknown'
            },
            creator: {
              id: 'user-1',
              name: 'John Doe'
            },
            lead: undefined,
            startDate: '2025-07-01',
            targetDate: '2025-12-31',
            startedAt: undefined,
            completedAt: undefined,
            canceledAt: undefined,
            progress: 0,
            health: 'onTrack',
            teams: [
              { id: 'team-1', name: 'Engineering', key: 'ENG' }
            ]
          }
        ],
        pageInfo: {
          hasNextPage: true,
          endCursor: 'cursor123'
        },
        totalCount: 2
      });

      expect(mockClient.projects).toHaveBeenCalledWith({
        first: 50,
        after: undefined,
        includeArchived: true,
        filter: undefined
      });
    });

    test('applies name filter correctly', async () => {
      const mockProjects = {
        nodes: [
          {
            id: 'project-1',
            name: 'Project Alpha',
            description: 'First test project',
            slugId: 'project-alpha',
            icon: '🚀',
            color: '#ff0000',
            state: Promise.resolve({ name: 'Active', type: 'active' }),
            creator: Promise.resolve({ id: 'user-1', name: 'John Doe' }),
            lead: Promise.resolve({ id: 'user-2', name: 'Jane Smith' }),
            startDate: '2025-01-01',
            targetDate: '2025-06-30',
            startedAt: new Date('2025-01-01'),
            completedAt: undefined,
            canceledAt: undefined,
            progress: 0.5,
            health: 'onTrack',
            teams: () => Promise.resolve({ nodes: [] })
          }
        ],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      };

      mockClient.projects.mockImplementation(async () => mockProjects);

      await service.getProjects({ nameFilter: 'Alpha' });

      expect(mockClient.projects).toHaveBeenCalledWith({
        first: 50,
        after: undefined,
        includeArchived: true,
        filter: { name: { contains: 'Alpha' } }
      });
    });

    test('handles pagination parameters', async () => {
      const mockProjects = {
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      };

      mockClient.projects.mockImplementation(async () => mockProjects);

      await service.getProjects({
        first: 10,
        after: 'cursor123',
        includeArchived: false
      });

      expect(mockClient.projects).toHaveBeenCalledWith({
        first: 10,
        after: 'cursor123',
        includeArchived: false,
        filter: undefined
      });
    });

    test('handles empty projects list', async () => {
      const mockProjects = {
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      };

      mockClient.projects.mockImplementation(async () => mockProjects);

      const result = await service.getProjects({});

      expect(result).toEqual({
        projects: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: undefined
        },
        totalCount: 0
      });
    });

    test('handles API errors gracefully', async () => {
      mockClient.projects.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.getProjects({}))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'Failed to fetch projects: API error'));
    });
  });

  describe('getProjectUpdates', () => {
    test('returns formatted project updates', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Project Alpha',
        projectUpdates: async () => ({
          nodes: [
            {
              id: 'update-1',
              body: 'First update',
              createdAt: new Date('2025-01-24'),
              updatedAt: new Date('2025-01-24'),
              health: 'onTrack',
              user: Promise.resolve({
                id: 'user-1',
                name: 'John Doe',
                displayName: 'John',
                email: 'john@example.com',
                avatarUrl: 'https://example.com/avatar.jpg'
              }),
              diffMarkdown: 'Some changes',
              url: 'https://linear.app/project/update/1'
            },
            {
              id: 'update-2',
              body: 'Second update',
              createdAt: new Date('2025-01-25'),
              updatedAt: new Date('2025-01-25'),
              health: 'atRisk',
              user: Promise.resolve({
                id: 'user-2',
                name: 'Jane Smith',
                displayName: 'Jane',
                email: 'jane@example.com',
                avatarUrl: undefined
              }),
              diffMarkdown: undefined,
              url: 'https://linear.app/project/update/2'
            }
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null
          }
        })
      };

      mockClient.project.mockImplementation(async () => mockProject);

      const result = await service.getProjectUpdates({ projectId: 'project-1' });

      expect(result).toEqual({
        projectUpdates: [
          {
            id: 'update-1',
            body: 'First update',
            createdAt: '2025-01-24T00:00:00.000Z',
            updatedAt: '2025-01-24T00:00:00.000Z',
            health: 'onTrack',
            user: {
              id: 'user-1',
              name: 'John Doe',
              displayName: 'John',
              email: 'john@example.com',
              avatarUrl: 'https://example.com/avatar.jpg'
            },
            diffMarkdown: 'Some changes',
            url: 'https://linear.app/project/update/1'
          },
          {
            id: 'update-2',
            body: 'Second update',
            createdAt: '2025-01-25T00:00:00.000Z',
            updatedAt: '2025-01-25T00:00:00.000Z',
            health: 'atRisk',
            user: {
              id: 'user-2',
              name: 'Jane Smith',
              displayName: 'Jane',
              email: 'jane@example.com',
              avatarUrl: undefined
            },
            diffMarkdown: undefined,
            url: 'https://linear.app/project/update/2'
          }
        ],
        project: {
          id: 'project-1',
          name: 'Project Alpha'
        },
        pageInfo: {
          hasNextPage: false,
          endCursor: undefined
        },
        totalCount: 2
      });
    });

    test('handles project not found', async () => {
      mockClient.project.mockImplementation(async () => null);

      await expect(service.getProjectUpdates({ projectId: 'nonexistent' }))
        .rejects.toThrow(new McpError(ErrorCode.InvalidRequest, 'Project not found: nonexistent'));
    });

    test('handles API errors gracefully', async () => {
      mockClient.project.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.getProjectUpdates({ projectId: 'project-1' }))
        .rejects.toThrow(new McpError(ErrorCode.InternalError, 'Failed to fetch project updates: API error'));
    });
  });

  describe('createProjectUpdate', () => {
    test('creates project update with required fields', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project'
      };
      
      // Mock the project function to return our test project
      mockClient.project.mockImplementation(async () => mockProject);
      
      // Mock the _request method for GraphQL mutation
      mockClient._request = mock(() => Promise.resolve({
        projectUpdateCreate: {
          success: true,
          projectUpdate: {
            id: 'update-1',
            body: 'Test update',
            health: 'onTrack',
            createdAt: '2025-01-24T00:00:00.000Z',
            updatedAt: '2025-01-24T00:00:00.000Z',
            project: {
              id: 'project-1',
              name: 'Test Project'
            },
            user: {
              id: 'user-1',
              name: 'Test User'
            }
          }
        }
      }));
      
      const result = await service.createProjectUpdate({
        projectId: 'project-1',
        body: 'Test update',
        health: ProjectUpdateHealthType.onTrack,
        isDiffHidden: false
      });
      
      // Verify project was checked
      expect(mockClient.project).toHaveBeenCalledWith('project-1');
      
      // Verify GraphQL mutation was called with correct parameters
      expect(mockClient._request).toHaveBeenCalledWith(
        expect.stringContaining('mutation ProjectUpdateCreate'),
        {
          input: {
            projectId: 'project-1',
            body: 'Test update',
            health: 'onTrack',
            isDiffHidden: false
          }
        }
      );
      
      // Verify the returned result
      expect(result).toEqual({
        id: 'update-1',
        body: 'Test update',
        health: 'onTrack',
        project: {
          id: 'project-1',
          name: 'Test Project'
        },
        user: {
          id: 'user-1',
          name: 'Test User'
        },
        createdAt: '2025-01-24T00:00:00.000Z',
        updatedAt: '2025-01-24T00:00:00.000Z'
      });
    });
    
    test('throws error when project not found', async () => {
      // Mock project function to return null (project not found)
      mockClient.project.mockImplementation(async () => null);
      
      await expect(service.createProjectUpdate({
        projectId: 'nonexistent',
        body: 'Test update'
      })).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, 'Project not found: nonexistent')
      );
      
      // Verify GraphQL mutation was not called
      expect(mockClient._request).not.toHaveBeenCalled();
    });
    
    test('throws error when update creation fails', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project'
      };
      
      mockClient.project.mockImplementation(async () => mockProject);
      
      // Mock _request to return unsuccessful response
      mockClient._request = mock(() => Promise.resolve({
        projectUpdateCreate: {
          success: false,
          projectUpdate: null
        }
      }));
      
      await expect(service.createProjectUpdate({
        projectId: 'project-1',
        body: 'Test update'
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to create project update')
      );
    });
    
    test('handles API errors gracefully', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project'
      };
      
      mockClient.project.mockImplementation(async () => mockProject);
      
      // Mock _request to throw an error
      mockClient._request = mock(() => {
        throw new Error('API error');
      });
      
      await expect(service.createProjectUpdate({
        projectId: 'project-1',
        body: 'Test update'
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to create project update: API error')
      );
    });
  });
});
