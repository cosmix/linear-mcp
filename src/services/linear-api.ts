import { LinearClient, Issue, Comment, IssueRelation } from '@linear/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { 
  GetIssueArgs, 
  SearchIssuesArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
  CreateCommentArgs,
  GetTeamsArgs,
  DeleteIssueArgs,
  GetProjectUpdatesArgs,
  GetProjectsArgs,
  CreateProjectUpdateArgs,
  ProjectUpdateHealthType,
  LinearIssue, 
  LinearIssueSearchResult,
  LinearComment,
  LinearRelationship,
  LinearTeam,
  LinearUser,
  LinearProjectUpdateResponse,
  LinearProject,
  LinearProjectsResponse,
  extractMentions,
  cleanDescription
} from '../types/linear.js';

export interface LinearClientInterface extends Pick<LinearClient, 'issue' | 'issues' | 'createIssue' | 'teams' | 'createComment' | 'viewer' | 'deleteIssue' | 'project' | 'projects'> {}

export class LinearAPIService {
  private client: LinearClientInterface;

  async getTeams(args: GetTeamsArgs): Promise<LinearTeam[]> {
    try {
      const teams = await this.client.teams();
      let filteredTeams = teams.nodes.filter(team => team && team.id); // Only require id to be present
      
      // Apply name filter if provided
      if (args.nameFilter) {
        const filter = args.nameFilter.toLowerCase();
        filteredTeams = filteredTeams.filter(team => {
          const name = team.name || '';
          const key = team.key || '';
          return name.toLowerCase().includes(filter) || key.toLowerCase().includes(filter);
        });
      }

      return filteredTeams.map(team => ({
        id: team.id,
        name: team.name || '', // Default to empty string if undefined
        key: team.key || '', // Default to empty string if undefined
        description: team.description || undefined
      }));
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch teams: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  constructor(clientOrApiKey: string | LinearClientInterface) {
    if (typeof clientOrApiKey === 'string') {
      if (!clientOrApiKey) {
        throw new Error('LINEAR_API_KEY is required');
      }
      this.client = new LinearClient({ apiKey: clientOrApiKey });
    } else {
      this.client = clientOrApiKey;
    }
  }

  private async getCurrentUser(): Promise<LinearUser> {
    const viewer = await this.client.viewer;
    return {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email
    };
  }

  private async getComments(issue: Issue): Promise<LinearComment[]> {
    const comments = await issue.comments();
    return Promise.all(
      comments.nodes.map(async (comment: Comment): Promise<LinearComment> => {
        const user = await comment.user;
        return {
          id: comment.id,
          body: comment.body,
          userId: user?.id ?? '',
          userName: user?.name,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt?.toISOString(),
        };
      })
    );
  }

  private async getRelationships(issue: Issue): Promise<LinearRelationship[]> {
    const relationships: LinearRelationship[] = [];

    // Get parent
    const parent = await issue.parent;
    if (parent) {
      relationships.push({
        type: 'parent',
        issueId: parent.id,
        identifier: parent.identifier,
        title: parent.title,
      });
    }

    // Get sub-issues
    const children = await issue.children();
    for (const child of children.nodes) {
      relationships.push({
        type: 'sub',
        issueId: child.id,
        identifier: child.identifier,
        title: child.title,
      });
    }

    // Get other relationships
    const relations = await issue.relations();
    for (const relation of relations.nodes) {
      const relatedIssue = await relation.relatedIssue;
      if (relatedIssue) {
        relationships.push({
          type: relation.type.toLowerCase() as 'related' | 'blocked' | 'blocking' | 'duplicate',
          issueId: relatedIssue.id,
          identifier: relatedIssue.identifier,
          title: relatedIssue.title,
        });
      }
    }

    return relationships;
  }

  async getIssue(args: GetIssueArgs): Promise<LinearIssue> {
    try {
      const issue = await this.client.issue(args.issueId);
      if (!issue) {
        throw new McpError(ErrorCode.InvalidRequest, `Issue not found: ${args.issueId}`);
      }

      // Get all issue data using SDK
      const [
        state,
        assignee,
        team,
        creator,
        labels,
        parent,
        children,
        relations
      ] = await Promise.all([
        issue.state,
        issue.assignee,
        issue.team,
        issue.creator,
        issue.labels(),
        issue.parent,
        issue.children(),
        issue.relations()
      ]);

      const issueData = {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        estimate: issue.estimate,
        dueDate: issue.dueDate,
        parent: parent ? {
          id: parent.id,
          identifier: parent.identifier,
          title: parent.title
        } : undefined,
        children: {
          nodes: children.nodes.map(child => ({
            id: child.id,
            identifier: child.identifier,
            title: child.title
          }))
        },
        relations: {
          nodes: relations.nodes.map(relation => ({
            type: relation.type,
            relatedIssue: relation.relatedIssue
          }))
        },
        state: { name: state?.name },
        assignee: { name: assignee?.name },
        team: { name: team?.name },
        creator: { name: creator?.name },
        labels: { nodes: labels.nodes.map(label => ({ name: label.name })) }
      };

      // Get relationships (always included)
      const relationships = await this.getRelationships(issue);

      // Get comments if requested
      let comments;
      if (args.includeRelationships) {
        comments = await this.getComments(issue);
      }

      // Extract mentions from description and comments
      const descriptionMentions = extractMentions(issueData.description);
      const commentMentions = comments?.reduce(
        (acc, comment) => {
          const mentions = extractMentions(comment.body);
          return {
            issues: [...acc.issues, ...mentions.issues],
            users: [...acc.users, ...mentions.users]
          };
        },
        { issues: [] as string[], users: [] as string[] }
      );

      // Combine and deduplicate mentions
      const mentionedIssues = [...new Set([
        ...descriptionMentions.issues,
        ...(commentMentions?.issues || [])
      ])];
      const mentionedUsers = [...new Set([
        ...descriptionMentions.users,
        ...(commentMentions?.users || [])
      ])];

      return {
        id: issueData.id,
        identifier: issueData.identifier,
        title: issueData.title,
        description: cleanDescription(issueData.description),
        status: issueData.state?.name,
        assignee: issueData.assignee?.name,
        priority: issueData.priority,
        createdAt: new Date(issueData.createdAt).toISOString(),
        updatedAt: new Date(issueData.updatedAt).toISOString(),
        teamName: issueData.team?.name,
        creatorName: issueData.creator?.name,
        labels: issueData.labels.nodes.map((label: { name: string }) => label.name),
        estimate: issueData.estimate,
        dueDate: issueData.dueDate ? new Date(issueData.dueDate).toISOString() : undefined,
        parent: issueData.parent ? {
          id: issueData.parent.id,
          identifier: issueData.parent.identifier,
          title: issueData.parent.title
        } : undefined,
        subIssues: issueData.children.nodes.map((child: { id: string; identifier: string; title: string }) => ({
          id: child.id,
          identifier: child.identifier,
          title: child.title
        })),
        comments,
        relationships,
        mentionedIssues,
        mentionedUsers,
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async createIssue(args: CreateIssueArgs): Promise<LinearIssue> {
    // If parentId provided, verify it exists and get its team
    if (args.parentId) {
      const parent = await this.client.issue(args.parentId);
      if (!parent) {
        throw new McpError(ErrorCode.InvalidRequest, `Parent issue not found: ${args.parentId}`);
      }
      // Use parent's team if not explicitly provided
      if (!args.teamId) {
        const parentTeam = await parent.team;
        if (!parentTeam) {
          throw new McpError(ErrorCode.InvalidRequest, `Could not get team from parent issue: ${args.parentId}`);
        }
        args.teamId = parentTeam.id;
      }
    }

    try {
      // If no teamId provided and no parentId, throw error
      if (!args.teamId && !args.parentId) {
        throw new McpError(ErrorCode.InvalidRequest, 'Either teamId or parentId must be provided');
      }

      // Handle self-assignment
      let assigneeId = args.assigneeId;
      if (assigneeId === 'me') {
        const currentUser = await this.getCurrentUser();
        assigneeId = currentUser.id;
      }

      // Create the issue
      const createdIssue = await this.client.createIssue({
        teamId: args.teamId!,  // We know it's defined because of the check above
        title: args.title,
        description: args.description,
        priority: args.priority,
        assigneeId,
        parentId: args.parentId,
        labelIds: args.labelIds
      }).then(response => response.issue);

      if (!createdIssue) {
        throw new McpError(ErrorCode.InternalError, 'Failed to create issue: No issue returned');
      }

      // Return full issue details using existing getIssue method
      return this.getIssue({ issueId: createdIssue.id });
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async updateIssue(args: UpdateIssueArgs): Promise<LinearIssue> {
    try {
      const issue = await this.client.issue(args.issueId);
      if (!issue) {
        throw new McpError(ErrorCode.InvalidRequest, `Issue not found: ${args.issueId}`);
      }

      // Handle self-assignment
      let assigneeId = args.assigneeId;
      if (assigneeId === 'me') {
        const currentUser = await this.getCurrentUser();
        assigneeId = currentUser.id;
      }

      // Prepare update payload with only defined fields
      const updatePayload: Record<string, any> = {};
      if (args.title !== undefined) updatePayload.title = args.title;
      if (args.description !== undefined) updatePayload.description = args.description;
      if (args.status !== undefined) updatePayload.status = args.status;
      if (args.priority !== undefined) updatePayload.priority = args.priority;
      if (assigneeId !== undefined) updatePayload.assigneeId = assigneeId;
      if (args.labelIds !== undefined) updatePayload.labelIds = args.labelIds;

      // Update the issue
      await issue.update(updatePayload);

      // Return full issue details using existing getIssue method
      return this.getIssue({ issueId: args.issueId });
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update issue: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async createComment(args: CreateCommentArgs): Promise<LinearComment> {
    try {
      // Verify issue exists
      const issue = await this.client.issue(args.issueId);
      if (!issue) {
        throw new McpError(ErrorCode.InvalidRequest, `Issue not found: ${args.issueId}`);
      }

      // Create comment using the client
      const result = await (this.client as LinearClient).createComment({
        issueId: issue.id,
        body: args.body
      });
      
      if (!result.success || !result.comment) {
        throw new McpError(ErrorCode.InternalError, 'Failed to create comment');
      }

      // Get the created comment
      const comment = await result.comment;
      const user = await comment.user;

      // Format response using our existing comment structure
      return {
        id: comment.id,
        body: comment.body,
        userId: user?.id ?? '',
        userName: user?.name,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt?.toISOString(),
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create comment: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deleteIssue(args: DeleteIssueArgs): Promise<void> {
    // Verify issue exists
    const issue = await this.client.issue(args.issueId);
    if (!issue) {
      throw new McpError(ErrorCode.InvalidRequest, `Issue not found: ${args.issueId}`);
    }

    try {
      // Delete the issue
      await issue.delete();
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete issue: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async resolveUserReferences(filter: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resolvedFilter = { ...filter };
    let currentUser: LinearUser | null = null;

    // Helper function to resolve 'me' references
    const resolveMe = async (value: unknown): Promise<unknown> => {
      if (value === 'me') {
        if (!currentUser) {
          currentUser = await this.getCurrentUser();
        }
        return currentUser.id;
      }
      return value;
    };

    // Resolve user references in comparators
    const resolveComparators = async (comparators: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(comparators)) {
        if (value === 'me') {
          resolved[key] = await resolveMe(value);
        } else if (Array.isArray(value)) {
          resolved[key] = await Promise.all(value.map(v => resolveMe(v)));
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    };

    // Recursively resolve user references in filters
    const resolveFilters = async (obj: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          if (key === 'assignee' || key === 'creator') {
            const userFilter = value as Record<string, unknown>;
            if (userFilter.id && typeof userFilter.id === 'object') {
              resolved[key] = {
                ...userFilter,
                id: await resolveComparators(userFilter.id as Record<string, unknown>)
              };
            } else {
              resolved[key] = value;
            }
          } else if (key === 'and' || key === 'or') {
            const arrayValue = value as Record<string, unknown>[];
            resolved[key] = await Promise.all(arrayValue.map(v => resolveFilters(v)));
          } else {
            resolved[key] = await resolveFilters(value as Record<string, unknown>);
          }
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    };

    return resolveFilters(resolvedFilter);
  }

  async searchIssues(args: SearchIssuesArgs): Promise<LinearIssueSearchResult[]> {
    try {
      // Build filter conditions
      const conditions: Record<string, unknown>[] = [];

      // Add search query condition if provided
      if (args.query) {
        conditions.push({
          or: [
            { title: { contains: args.query } },
            { description: { contains: args.query } },
          ] as Record<string, unknown>[],
        });
      }

      // Handle project filtering (backward compatibility)
      if (args.projectId || args.projectName) {
        // If projectName is provided but not projectId, try to find the project by name
        if (!args.projectId && args.projectName) {
          const projects = await this.getProjects({ 
            nameFilter: args.projectName, 
            first: 2,
            after: undefined,
            includeArchived: true 
          });
          
          if (projects.projects.length === 0) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `No projects found matching name: ${args.projectName}`
            );
          }
          
          if (projects.projects.length > 1) {
            const projectNames = projects.projects.map(p => `"${p.name}" (${p.id})`).join(', ');
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Multiple projects match name "${args.projectName}": ${projectNames}. Please use projectId instead.`
            );
          }
          
          // Exactly one match found, use its ID
          args.projectId = projects.projects[0].id;
        }
        
        // Add project filter condition
        conditions.push({
          project: {
            id: { eq: args.projectId }
          } as Record<string, unknown>
        });
      }

      // Handle advanced filters
      if (args.filter) {
        const { assignedTo, createdBy, and, or, ...fieldFilters } = args.filter;

        // Handle backward compatibility filters
        if (assignedTo) {
          conditions.push({
            assignee: {
              id: { eq: assignedTo }
            } as Record<string, unknown>
          });
        }

        if (createdBy) {
          conditions.push({
            creator: {
              id: { eq: createdBy }
            } as Record<string, unknown>
          });
        }

        // Handle field filters
        if (Object.keys(fieldFilters).length > 0) {
          conditions.push(fieldFilters as Record<string, unknown>);
        }

        // Handle logical operators
        if (and) {
          conditions.push({ and: and as Record<string, unknown>[] });
        }

        if (or) {
          conditions.push({ or: or as Record<string, unknown>[] });
        }
      }

      // Combine all conditions with AND
      let filter: Record<string, unknown> | undefined = conditions.length > 0 
        ? { and: conditions }
        : undefined;

      // Resolve any 'me' references in the filter
      if (filter) {
        filter = await this.resolveUserReferences(filter);
      }

      const issues = await this.client.issues({ filter });

      return Promise.all(
        issues.nodes.map(async (issue) => {
          const [state, assignee, team, labels] = await Promise.all([
            issue.state,
            issue.assignee,
            issue.team,
            issue.labels(),
          ]);
          
          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            status: state?.name,
            assignee: assignee?.name,
            priority: issue.priority,
            teamName: team?.name,
            labels: labels.nodes.map(label => label.name),
          };
        })
      );
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

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
      const projects = await (this.client as LinearClient).projects({
        first,
        after: args.after,
        includeArchived,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      // Process and format the results
      const formattedProjects: LinearProject[] = await Promise.all(
        projects.nodes.map(async (project) => {
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
            teams: teams.nodes.map(team => ({
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
      const project = await (this.client as LinearClient).project(args.projectId);
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
