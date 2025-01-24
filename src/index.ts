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
import { isGetIssueArgs, isSearchIssuesArgs } from './types/linear.js';

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
        version: '0.1.0',
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
          name: 'get_issue',
          description: 'Get detailed information about a specific Linear issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueId: {
                type: 'string',
                description: 'The ID or key of the Linear issue',
              },
            },
            required: ['issueId'],
          },
        },
        {
          name: 'search_issues',
          description: 'Search for Linear issues using a query string',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for Linear issues',
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'get_issue':
            return await this.handleGetIssue(request.params.arguments);
          case 'search_issues':
            return await this.handleSearchIssues(request.params.arguments);
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Linear MCP server running on stdio');
  }
}

const server = new LinearServer();
server.run().catch(console.error);
