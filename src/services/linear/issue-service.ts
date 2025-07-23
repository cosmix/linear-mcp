import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { CycleFilter } from '../../types/linear/cycle';
import {
  CreateIssueArgs,
  DeleteIssueArgs,
  GetIssueArgs,
  LinearIssue,
  UpdateIssueArgs
} from '../../types/linear/issue';
import { LinearBaseService, LinearClientInterface } from './base-service';
import { CycleService } from './cycle-service';
import { cleanDescription, extractMentions, getComments, getRelationships } from './utils';

export class IssueService extends LinearBaseService {
  private cycleService: CycleService;

  constructor(clientOrApiKey: string | LinearClientInterface) {
    super(clientOrApiKey);
    this.cycleService = new CycleService(this.client);
  }
  /**
   * Gets detailed information about a specific issue
   * @param args The issue retrieval arguments
   * @returns Detailed issue information
   */
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
      const relationships = await getRelationships(issue);

      // Get comments if requested
      let comments;
      if (args.includeRelationships) {
        comments = await getComments(issue);
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

  /**
   * Creates a new issue
   * @param args The issue creation arguments
   * @returns The created issue
   */
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
        labelIds: args.labelIds,
        projectId: args.projectId
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

  /**
   * Updates an existing issue
   * @param args The issue update arguments
   * @returns The updated issue
   */
  /**
   * Checks if a string might be a cycle name or type that needs resolution
   * @param cycleId The cycle ID to check
   * @returns True if the cycleId might be a cycle name or type
   */
  private isCycleNameOrType(cycleId: string): boolean {
    // Check if it's a cycle type
    if (['current', 'next', 'previous'].includes(cycleId)) {
      return true;
    }
    
    // Check if it's a numeric cycle number
    if (/^\d+$/.test(cycleId)) {
      return true;
    }
    
    // Otherwise, assume it's a UUID
    return false;
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
      if (assigneeId !== undefined) updatePayload.assigneeId = assigneeId;
      if (args.labelIds !== undefined) updatePayload.labelIds = args.labelIds;

      // Get the team ID for the issue - needed for status and cycle resolution
      const team = await issue.team;
      if (!team) {
        throw new McpError(ErrorCode.InvalidRequest, `Could not get team for issue: ${args.issueId}`);
      }

      // Handle Status Resolution
      if (args.status !== undefined) {
        try {
          const states = await team.states();
          const matchingState = states.nodes.find(state => state.name.toLowerCase() === args.status!.toLowerCase());
          if (!matchingState) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid status name "${args.status}" for team "${team.name}". Valid statuses are: ${states.nodes.map(s => s.name).join(', ')}`);
          }
          updatePayload.stateId = matchingState.id; // Use stateId instead of status
        } catch (error) {
          if (error instanceof McpError) throw error;
          throw new McpError(ErrorCode.InternalError, `Failed to resolve status: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Handle Priority Validation
      if (args.priority !== undefined) {
        if (args.priority < 0 || args.priority > 4) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid priority value "${args.priority}". Priority must be between 0 (No priority) and 4 (Low).`);
        }
        updatePayload.priority = args.priority;
      }
      
      // Handle cycle ID resolution if needed
      if (args.cycleId !== undefined) {
        // Team already fetched above
        // Check if the cycleId is a cycle name or type that needs resolution
        if (this.isCycleNameOrType(args.cycleId)) {
          try {
            // Create a cycle filter based on the provided cycleId
            let cycleFilter: CycleFilter;
            
            if (['current', 'next', 'previous'].includes(args.cycleId)) {
              // It's a cycle type
              cycleFilter = {
                type: args.cycleId as 'current' | 'next' | 'previous',
                teamId: team.id
              };
            } else {
              // It's a cycle number
              cycleFilter = {
                type: 'specific',
                id: args.cycleId,
                teamId: team.id
              };
            }
            
            // Resolve the cycle filter to a specific cycle ID
            const resolvedCycleId = await this.cycleService.resolveCycleFilter(cycleFilter);
            updatePayload.cycleId = resolvedCycleId;
          } catch (error) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Failed to resolve cycle: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } else {
          // It's already a UUID, use it directly
          updatePayload.cycleId = args.cycleId;
        }
      }

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

  /**
   * Deletes an issue
   * @param args The issue deletion arguments
   */
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
}
