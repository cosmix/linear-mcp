import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { CreateCommentArgs } from '../../types/linear/comment';
import { LinearComment } from '../../types/linear/issue';
import { LinearBaseService } from './base-service';

export class CommentService extends LinearBaseService {
  /**
   * Creates a new comment on an issue
   * @param args The comment creation arguments
   * @returns The created comment
   */
  async createComment(args: CreateCommentArgs): Promise<LinearComment> {
    try {
      // Verify issue exists
      const issue = await this.client.issue(args.issueId);
      if (!issue) {
        throw new McpError(ErrorCode.InvalidRequest, `Issue not found: ${args.issueId}`);
      }

      // Create comment using the client
      const result = await (this.client as any).createComment({
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
}
