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
import { isGetIssueArgs, isSearchIssuesArgs, isCreateIssueArgs, isUpdateIssueArgs, isGetTeamsArgs, isCreateCommentArgs, isDeleteIssueArgs, isGetProjectUpdatesArgs, isGetProjectsArgs } from './types/linear.js';

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
          description: 'Create a new Linear issue with optional parent linking. Supports self-assignment using "me" as assigneeId.',
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
                description: 'ID of the user to assign the issue to. Use "me" to assign to the current authenticated user, or a specific user ID.',
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
          description: 'Update an existing Linear issue. Supports self-assignment using "me" as assigneeId.',
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
                description: 'ID of the new assignee. Use "me" to assign to the current authenticated user, or a specific user ID.',
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
          description: 'Search for Linear issues using a query string and advanced filters. Supports filtering by assignee and creator, with special "me" keyword for self-reference. Examples: 1. Find your assigned issues: {query: "", filter: {assignedTo: "me"}}, 2. Find issues you created: {query: "", filter: {createdBy: "me"}}, 3. Find issues assigned to specific user: {query: "", filter: {assignedTo: "user-id-123"}}, 4. Combine with text search: {query: "bug", filter: {assignedTo: "me"}}',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Text to search in issue titles and descriptions. Can be empty string if only using filters.',
              },
              includeRelationships: {
                type: 'boolean',
                description: 'Include additional metadata like team and labels in search results',
                default: false,
              },
              filter: {
                type: 'object',
                description: 'Optional filters to narrow down search results',
                properties: {
                  assignedTo: {
                    type: 'string',
                    description: 'Filter by assignee. Use "me" to find issues assigned to the current user, or a specific user ID.',
                  },
                  createdBy: {
                    type: 'string',
                    description: 'Filter by creator. Use "me" to find issues created by the current user, or a specific user ID.',
                  }
                }
              }
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
        {
          name: 'delete_issue',
          description: 'Delete an existing Linear issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'ID or key of the issue to delete',
              },
            },
            required: ['issueId'],
          },
        },
        {
          name: 'get_projects',
          description: 'Get a list of Linear projects with optional name filtering and pagination',
          inputSchema: {
            type: 'object',
            properties: {
              nameFilter: {
                type: 'string',
                description: 'Optional filter to search by project name'
              },
              includeArchived: {
                type: 'boolean',
                description: 'Whether to include archived projects (default: true)',
                default: true
              },
              first: {
                type: 'number',
                description: 'Number of items to return (default: 50, max: 100)',
                default: 50
              },
              after: {
                type: 'string',
                description: 'Cursor for pagination. Use the endCursor from a previous response to fetch the next page'
              }
            },
            required: [] // All properties are optional
          }
        },
        {
          name: 'get_project_updates',
          description: 'Get project updates for a given project ID with optional filtering parameters',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'ID of the project to get updates for'
              },
              includeArchived: {
                type: 'boolean',
                description: 'Whether to include archived updates (default: true)',
                default: true
              },
              first: {
                type: 'number',
                description: 'Number of items to return (default: 50, max: 100)',
                default: 50
              },
              after: {
                type: 'string',
                description: 'Cursor for pagination. Use the endCursor from a previous response to fetch the next page'
              },
              createdAfter: {
                type: 'string',
                description: 'ISO date string. Only return updates created after this date'
              },
              createdBefore: {
                type: 'string',
                description: 'ISO date string. Only return updates created before this date'
              },
              userId: {
                type: 'string',
                description: 'Filter updates by creator. Use "me" to find updates created by the current user, or a specific user ID'
              },
              health: {
                type: 'string',
                description: 'Filter updates by health status (e.g., "onTrack", "atRisk", "offTrack")'
              }
            },
            required: ['projectId']
          }
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
          case 'delete_issue':
            return await this.handleDeleteIssue(request.params.arguments);
          case 'get_projects':
            return await this.handleGetProjects(request.params.arguments);
          case 'get_project_updates':
            return await this.handleGetProjectUpdates(request.params.arguments);
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

  private async handleDeleteIssue(args: unknown) {
    if (!isDeleteIssueArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid delete_issue arguments'
      );
    }

    await this.linearAPI.deleteIssue(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, message: 'Issue deleted successfully' }),
        },
      ],
    };
  }

  private async handleGetProjects(args: unknown) {
    if (!isGetProjectsArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid get_projects arguments'
      );
    }

    const projects = await this.linearAPI.getProjects(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  }

  private async handleGetProjectUpdates(args: unknown) {
    if (!isGetProjectUpdatesArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid get_project_updates arguments'
      );
    }

    const projectUpdates = await this.linearAPI.getProjectUpdates(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projectUpdates, null, 2),
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
