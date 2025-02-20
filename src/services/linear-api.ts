import { LinearClient, Issue, Comment, IssueRelation } from '@linear/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { 
  GetIssueArgs, 
  SearchIssuesArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
  CreateCommentArgs,
  GetTeamsArgs,
  LinearIssue, 
  LinearIssueSearchResult,
  LinearComment,
  LinearRelationship,
  LinearTeam,
  LinearUser,
  extractMentions,
  cleanDescription
} from '../types/linear.js';

export interface LinearClientInterface extends Pick<LinearClient, 'issue' | 'issues' | 'createIssue' | 'teams' | 'createComment' | 'viewer'> {}

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

  async searchIssues(args: SearchIssuesArgs): Promise<LinearIssueSearchResult[]> {
    try {
      // Build filter conditions
      const conditions: any[] = [];

      // Add search query condition if provided
      if (args.query) {
        conditions.push({
          or: [
            { title: { contains: args.query } },
            { description: { contains: args.query } },
          ],
        });
      }

      // Handle user filters
      if (args.filter) {
        const currentUser = args.filter.assignedTo === 'me' || args.filter.createdBy === 'me' 
          ? await this.getCurrentUser()
          : null;

        if (args.filter.assignedTo) {
          conditions.push({
            assignee: {
              id: { eq: args.filter.assignedTo === 'me' ? currentUser!.id : args.filter.assignedTo }
            }
          });
        }

        if (args.filter.createdBy) {
          conditions.push({
            creator: {
              id: { eq: args.filter.createdBy === 'me' ? currentUser!.id : args.filter.createdBy }
            }
          });
        }
      }

      // Combine all conditions with AND
      const filter = conditions.length > 0 
        ? { and: conditions }
        : undefined;

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
}
