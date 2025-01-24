import { LinearClient } from '@linear/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { GetIssueArgs, SearchIssuesArgs, LinearIssue, LinearIssueSearchResult } from '../types/linear.js';

export type LinearClientInterface = Pick<LinearClient, 'issue' | 'issues'>;

export class LinearAPIService {
  private client: LinearClientInterface;

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

  async getIssue(args: GetIssueArgs): Promise<LinearIssue> {
    const issue = await this.client.issue(args.issueId);
    if (!issue) {
      throw new McpError(ErrorCode.InvalidRequest, `Issue not found: ${args.issueId}`);
    }

    const [state, assignee] = await Promise.all([
      issue.state,
      issue.assignee
    ]);

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      status: state?.name,
      assignee: assignee?.name,
      priority: issue.priority,
      createdAt: issue.createdAt?.toISOString(),
      updatedAt: issue.updatedAt?.toISOString(),
    };
  }

  async searchIssues(args: SearchIssuesArgs): Promise<LinearIssueSearchResult[]> {
    const issues = await this.client.issues({
      filter: {
        or: [
          { title: { contains: args.query } },
          { description: { contains: args.query } },
        ],
      },
    });

    return Promise.all(
      issues.nodes.map(async (issue) => {
        const [state, assignee] = await Promise.all([
          issue.state,
          issue.assignee
        ]);
        
        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          status: state?.name,
          assignee: assignee?.name,
          priority: issue.priority,
        };
      })
    );
  }
}
