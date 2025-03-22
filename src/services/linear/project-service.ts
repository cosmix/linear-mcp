import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  CreateProjectUpdateArgs,
  GetProjectsArgs,
  GetProjectUpdatesArgs,
  LinearProjectsResponse,
  LinearProjectUpdateResponse,
  ProjectUpdateHealthType
} from '../../types/linear/project';
import { LinearBaseService } from './base-service';

export class ProjectService extends LinearBaseService {
  /**
   * Gets a list of projects with optional filtering
   * @param args The project filtering arguments
   * @returns List of projects with pagination info
   */
  async getProjects(args: GetProjectsArgs): Promise<LinearProjectsResponse> {
    try {
      // Validate and normalize arguments
      const first = Math.min(args.first || 50, 100); // Cap at 100
      const includeArchived = args.includeArchived !== false; // Default to true if not explicitly set to false
      
      // Build filter conditions
      const filter: Record<string, any> = {};
      
      if (args.nameFilter) {
        filter.name = { contains: args.nameFilter };
      }
      
      // Fetch projects with pagination
      const projects = await (this.client as any).projects({
        first,
        after: args.after,
        includeArchived,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      // Process and format the results
      const formattedProjects = await Promise.all(
        projects.nodes.map(async (project: any) => {
          // Fetch related data
          const [creator, lead, teams, state] = await Promise.all([
            project.creator,
            project.lead,
            project.teams(),
            project.state
          ]);
          
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            slugId: project.slugId,
            icon: project.icon,
            color: project.color,
            status: {
              name: 'Unknown', // We'll use a default value for now
              type: 'Unknown'
            },
            creator: creator ? {
              id: creator.id,
              name: creator.name
            } : undefined,
            lead: lead ? {
              id: lead.id,
              name: lead.name
            } : undefined,
            startDate: project.startDate,
            targetDate: project.targetDate,
            startedAt: project.startedAt?.toISOString(),
            completedAt: project.completedAt?.toISOString(),
            canceledAt: project.canceledAt?.toISOString(),
            progress: project.progress,
            health: project.health,
            teams: teams.nodes.map((team: any) => ({
              id: team.id,
              name: team.name,
              key: team.key
            }))
          };
        })
      );
      
      // Extract pagination information
      const pageInfo = {
        hasNextPage: projects.pageInfo.hasNextPage,
        endCursor: projects.pageInfo.endCursor || undefined
      };
      
      return {
        projects: formattedProjects,
        pageInfo,
        totalCount: formattedProjects.length
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch projects: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets project updates for a specific project
   * @param args The project updates filtering arguments
   * @returns List of project updates with pagination info
   */
  async getProjectUpdates(args: GetProjectUpdatesArgs): Promise<LinearProjectUpdateResponse> {
    try {
      // Validate and normalize arguments
      const first = Math.min(args.first || 50, 100); // Cap at 100
      const includeArchived = args.includeArchived !== false; // Default to true if not explicitly set to false
      
      // Handle 'me' user ID reference
      let userId = args.userId;
      if (userId === 'me') {
        const currentUser = await this.getCurrentUser();
        userId = currentUser.id;
      }

      // Fetch the project to verify it exists
      const project = await (this.client as any).project(args.projectId);
      if (!project) {
        throw new McpError(ErrorCode.InvalidRequest, `Project not found: ${args.projectId}`);
      }

      // Build filter conditions for project updates
      const filter: Record<string, any> = {};
      
      if (args.createdAfter) {
        filter.createdAt = { ...filter.createdAt, gte: new Date(args.createdAfter) };
      }
      
      if (args.createdBefore) {
        filter.createdAt = { ...filter.createdAt, lte: new Date(args.createdBefore) };
      }
      
      if (userId) {
        filter.user = { id: { eq: userId } };
      }
      
      if (args.health) {
        // Validate health is a valid enum value
        if (!Object.values(ProjectUpdateHealthType).includes(args.health as ProjectUpdateHealthType)) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid health value: ${args.health}. Valid values are: ${Object.values(ProjectUpdateHealthType).join(', ')}`
          );
        }
        filter.health = { eq: args.health };
      }

      // Fetch project updates with pagination
      // Note: Linear SDK doesn't support filtering project updates directly,
      // so we'll fetch all and filter in memory
      const projectUpdates = await project.projectUpdates({
        first,
        after: args.after,  // Add cursor for pagination
        includeArchived
      });

      // Get all updates first
      let allUpdates = [...projectUpdates.nodes];
      
      // Prepare filtered updates
      let filteredUpdates = [...allUpdates];
      
      // Apply date filters in memory
      if (args.createdAfter) {
        const afterDate = new Date(args.createdAfter);
        filteredUpdates = filteredUpdates.filter(update => 
          new Date(update.createdAt) >= afterDate
        );
      }
      
      if (args.createdBefore) {
        const beforeDate = new Date(args.createdBefore);
        filteredUpdates = filteredUpdates.filter(update => 
          new Date(update.createdAt) <= beforeDate
        );
      }
      
      if (args.health) {
        // We've already validated the health value earlier
        filteredUpdates = filteredUpdates.filter(update => 
          update.health === args.health
        );
      }
      
      // For user filtering, we need to pre-fetch all users
      if (userId) {
        // Get all users for the updates
        const updateUsers = await Promise.all(
          filteredUpdates.map(async update => {
            return {
              update,
              user: await update.user
            };
          })
        );
        
        // Filter by user ID
        filteredUpdates = updateUsers
          .filter(item => item.user?.id === userId)
          .map(item => item.update);
      }

      // Process and format the results
      const formattedUpdates = await Promise.all(
        filteredUpdates.map(async (update) => {
          const user = await update.user;
          
          return {
            id: update.id,
            body: update.body,
            createdAt: update.createdAt.toISOString(),
            updatedAt: update.updatedAt.toISOString(),
            health: update.health,
            user: {
              id: user?.id || '',
              name: user?.name || '',
              displayName: user?.displayName,
              email: user?.email,
              avatarUrl: user?.avatarUrl
            },
            diffMarkdown: update.diffMarkdown,
            url: update.url
          };
        })
      );

      // Extract pagination information
      const pageInfo = {
        hasNextPage: projectUpdates.pageInfo.hasNextPage,
        endCursor: projectUpdates.pageInfo.endCursor || undefined
      };

      return {
        projectUpdates: formattedUpdates,
        project: {
          id: project.id,
          name: project.name
        },
        pageInfo,
        totalCount: formattedUpdates.length
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch project updates: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates a new project update
   * @param args The project update creation parameters
   * @returns The created project update details
   */
  async createProjectUpdate(args: CreateProjectUpdateArgs): Promise<any> {
    try {
      // Verify project exists
      const project = await this.client.project(args.projectId);
      if (!project) {
        throw new McpError(ErrorCode.InvalidRequest, `Project not found: ${args.projectId}`);
      }

      // Prepare input for Linear SDK
      const input: Record<string, any> = {
        input: {
          projectId: args.projectId
        }
      };

      // Add optional fields if provided
      if (args.body !== undefined) input.input.body = args.body;
      if (args.health !== undefined) {
        // Validate health is a valid enum value
        if (!Object.values(ProjectUpdateHealthType).includes(args.health as ProjectUpdateHealthType)) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid health value: ${args.health}. Valid values are: ${Object.values(ProjectUpdateHealthType).join(', ')}`
          );
        }
        input.input.health = args.health;
      }
      if (args.isDiffHidden !== undefined) input.input.isDiffHidden = args.isDiffHidden;

      // Create the project update using Linear client's GraphQL mutation
      const mutation = `
        mutation ProjectUpdateCreate($input: ProjectUpdateCreateInput!) {
          projectUpdateCreate(input: $input) {
            lastSyncId
            projectUpdate {
              id
              body
              health
              project {
                id
                name
              }
              user {
                id
                name
              }
              createdAt
              updatedAt
            }
            success
          }
        }
      `;

      // Execute the mutation
      const result = await (this.client as any)._request(mutation, input);
      
      if (!result.projectUpdateCreate.success || !result.projectUpdateCreate.projectUpdate) {
        throw new McpError(ErrorCode.InternalError, 'Failed to create project update');
      }

      // Get the created project update
      const projectUpdate = result.projectUpdateCreate.projectUpdate;
      
      return {
        id: projectUpdate.id,
        body: projectUpdate.body,
        health: projectUpdate.health,
        project: {
          id: projectUpdate.project.id,
          name: projectUpdate.project.name
        },
        user: {
          id: projectUpdate.user.id || '',
          name: projectUpdate.user.name || ''
        },
        createdAt: new Date(projectUpdate.createdAt).toISOString(),
        updatedAt: new Date(projectUpdate.updatedAt).toISOString()
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project update: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
