#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { LinearAPIService } from './services/linear-api.js';
import { isGetIssueArgs, isSearchIssuesArgs, isCreateIssueArgs, isUpdateIssueArgs, isGetTeamsArgs, isCreateCommentArgs } from './types/linear.js';

// Get Linear API key from environment variable
const API_KEY = process.env.LINEAR_API_KEY;
if (!API_KEY) {
  throw new Error('LINEAR_API_KEY environment variable is required');
}

class LinearServer {
  private server: Server;
  private linearAPI: LinearAPIService;

  constructor() {
    this.server = new Server(
      {
        name: 'linear-mcp',
        version: '0.3.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.linearAPI = new LinearAPIService(API_KEY as string);

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_issue',
          description: 'Create a new Linear issue with optional parent linking',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: {
                type: 'string',
                description: 'ID of the team to create the issue in. Required unless parentId is provided.',
              },
              title: {
                type: 'string',
                description: 'Title of the issue',
              },
              description: {
                type: 'string',
                description: 'Description of the issue (markdown supported)',
              },
              parentId: {
                type: 'string',
                description: 'ID of the parent issue. If provided, creates a subissue.',
              },
              status: {
                type: 'string',
                description: 'Status of the issue',
              },
              priority: {
                type: 'number',
                description: 'Priority of the issue (0-4)',
              },
              assigneeId: {
                type: 'string',
                description: 'ID of the user to assign the issue to',
              },
              labelIds: {
                type: 'array',
                description: 'Array of label IDs to attach to the issue',
                items: {
                  type: 'string'
                }
              }
            },
            required: ['title'],
          },
        },
        {
          name: 'update_issue',
          description: 'Update an existing Linear issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'ID or key of the issue to update',
              },
              title: {
                type: 'string',
                description: 'New title for the issue',
              },
              description: {
                type: 'string',
                description: 'New description for the issue (markdown supported)',
              },
              status: {
                type: 'string',
                description: 'New status for the issue',
              },
              priority: {
                type: 'number',
                description: 'New priority for the issue (0-4)',
              },
              assigneeId: {
                type: 'string',
                description: 'ID of the new assignee',
              },
              labelIds: {
                type: 'array',
                description: 'New array of label IDs',
                items: {
                  type: 'string'
                }
              }
            },
            required: ['issueId'],
          },
        },
        {
          name: 'get_issue',
          description: 'Get detailed information about a specific Linear issue including optional relationships and cleaned content',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'The ID or key of the Linear issue',
              },
              includeRelationships: {
                type: 'boolean',
                description: 'Include comments, parent/sub-issues, and related issues. Also extracts mentions from content.',
                default: false,
              },
            },
            required: ['issueId'],
          },
        },
        {
          name: 'search_issues',
          description: 'Search for Linear issues using a query string with enhanced metadata',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for Linear issues',
              },
              includeRelationships: {
                type: 'boolean',
                description: 'Include additional metadata like team and labels in search results',
                default: false,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_teams',
          description: 'Get a list of Linear teams with optional name/key filtering',
          inputSchema: {
            type: 'object',
            properties: {
              nameFilter: {
                type: 'string',
                description: 'Optional filter to search by team name or key',
              },
            },
          },
        },
        {
          name: 'create_comment',
          description: 'Create a new comment on a Linear issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'ID or key of the issue to comment on',
              },
              body: {
                type: 'string',
                description: 'Content of the comment (markdown supported)',
              },
            },
            required: ['issueId', 'body'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'create_issue':
            return await this.handleCreateIssue(request.params.arguments);
          case 'get_issue':
            return await this.handleGetIssue(request.params.arguments);
          case 'search_issues':
            return await this.handleSearchIssues(request.params.arguments);
          case 'update_issue':
            return await this.handleUpdateIssue(request.params.arguments);
          case 'get_teams':
            return await this.handleGetTeams(request.params.arguments);
          case 'create_comment':
            return await this.handleCreateComment(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Linear API error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async handleGetIssue(args: unknown) {
    if (!isGetIssueArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid get_issue arguments');
    }

    const issue = await this.linearAPI.getIssue(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  private async handleCreateIssue(args: unknown) {
    if (!isCreateIssueArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid create_issue arguments');
    }

    const issue = await this.linearAPI.createIssue(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  private async handleSearchIssues(args: unknown) {
    if (!isSearchIssuesArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid search_issues arguments'
      );
    }

    const issues = await this.linearAPI.searchIssues(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issues, null, 2),
        },
      ],
    };
  }

  private async handleUpdateIssue(args: unknown) {
    if (!isUpdateIssueArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid update_issue arguments');
    }

    const issue = await this.linearAPI.updateIssue(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  private async handleGetTeams(args: unknown) {
    if (!isGetTeamsArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid get_teams arguments'
      );
    }

    const teams = await this.linearAPI.getTeams(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(teams, null, 2),
        },
      ],
    };
  }

  private async handleCreateComment(args: unknown) {
    if (!isCreateCommentArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid create_comment arguments'
      );
    }

    const comment = await this.linearAPI.createComment(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(comment, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Linear MCP server running on stdio');
  }
}

const server = new LinearServer();
server.run().catch(console.error);
