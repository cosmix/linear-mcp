#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { LinearAPIService } from './services/linear/index';
import {
  isCreateCommentArgs, isCreateDocumentArgs, isCreateIssueArgs, isCreateProjectUpdateArgs,
  isDeleteDocumentArgs, isDeleteIssueArgs, isGetDocumentArgs, isGetDocumentsArgs, isGetIssueArgs,
  isGetProjectUpdatesArgs, isGetProjectsArgs, isGetTeamsArgs, isSearchIssuesArgs,
  isUpdateDocumentArgs, isUpdateIssueArgs
} from './types/linear/index';

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
          description: 'Update an existing Linear issue. Supports self-assignment using "me" as assigneeId and cycle assignment via cycleId. You can provide a cycle name (e.g., "2"), a relative cycle at the moment of updating ("current", "next", "previous"), or a cycle UUID directly.',
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
                description: 'New status name for the issue (e.g., "Todo", "In Progress"). Must be valid for the issue\'s team.',
              },
              priority: {
                type: 'number',
                description: 'New priority for the issue (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)',
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
              },
              cycleId: {
                type: 'string',
                description: 'ID of the cycle to assign the issue to. You can provide a cycle name (e.g., "2"), a relative cycle ("current", "next", "previous"), or a cycle UUID directly.'
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
          description: 'Search for Linear issues using a query string and advanced filters. Supports Linear\'s powerful filtering capabilities.\n\nExamples:\n1. Basic search: {query: "bug"}\n2. High priority issues: {query: "", filter: {priority: {gte: 2}}}\n3. Issues due soon: {query: "", filter: {dueDate: {lt: "P2W"}}}\n4. Issues with specific labels: {query: "", filter: {labels: {name: {in: ["Bug", "Critical"]}}}}\n5. Complex filters: {query: "", filter: {and: [{priority: {gte: 2}}, {state: {type: {eq: "started"}}}], or: [{assignee: {id: {eq: "me"}}}, {creator: {id: {eq: "me"}}}]}}\n6. Issues in a project: {query: "", filter: {project: {id: {eq: "project-id"}}}}\n7. Issues by state type: {query: "", filter: {state: {type: {eq: "started"}}}}\n8. Issues in current cycle: {query: "", filter: {cycle: {type: "current", teamId: "team-123"}}}\n9. Issues in next cycle: {query: "", filter: {cycle: {type: "next", teamId: "team-123"}}}\n10. Issues in previous cycle: {query: "", filter: {cycle: {type: "previous", teamId: "team-123"}}}\n11. Issues in specific cycle by UUID: {query: "", filter: {cycle: {type: "specific", id: "cycle-456"}}} or by cycle number: {query: "", filter: {cycle: {type: "specific", id: "2", teamId: "team-123"}}} (teamId is required when using cycle number)\n12. High priority bugs in current cycle: {query: "bug", filter: {and: [{cycle: {type: "current", teamId: "team-123"}}, {priority: {gte: 2}}], assignee: {id: {eq: "me"}}}}\n\nSupported comparators:\n- String fields: eq, neq, in, nin, contains, startsWith, endsWith (plus case-insensitive variants)\n- Number fields: eq, neq, lt, lte, gt, gte, in, nin\n- Date fields: eq, neq, lt, lte, gt, gte (supports ISO 8601 durations like "P2W" for relative dates)\n\nFilterable fields:\n- Basic: title, description, priority, estimate, dueDate, createdAt, updatedAt, completedAt, startedAt, canceledAt\n- Relationships:\n  * assignee: {id: {...}, name: {...}}\n  * creator: {id: {...}, name: {...}}\n  * team: {id: {...}, name: {...}, key: {...}}\n  * state: {id: {...}, name: {...}, type: {...}}\n  * labels: {name: {...}, every: {name: {...}}}\n  * project: {id: {...}, name: {...}}\n  * cycle: {type: "current"|"next"|"previous"|"specific", teamId: "...", id: "..."}\n\nLogical operators:\n- and: Array of filters that must all match\n- or: Array of filters where at least one must match\n\nBackward compatibility:\n- assignedTo: "me" or user ID (shorthand for assignee.id.eq)\n- createdBy: "me" or user ID (shorthand for creator.id.eq)\n- projectId: direct project ID (shorthand for project.id.eq)\n- projectName: project name lookup',
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
                description: 'Advanced filters using Linear\'s filtering capabilities. See description for details and examples.',
              },
              projectId: {
                type: 'string',
                description: 'Filter issues by project ID. Takes precedence over projectName if both are provided.'
              },
              projectName: {
                type: 'string',
                description: 'Filter issues by project name. Will be used to find matching projects if projectId is not provided.'
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
        {
          name: 'create_project_update',
          description: 'Create a new update for a Linear project',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'ID of the project for which to create an update'
              },
              body: {
                type: 'string',
                description: 'Content of the update in markdown format'
              },
              health: {
                type: 'string',
                enum: ['onTrack', 'atRisk', 'offTrack'],
                description: 'Health status of the project at the time of the update'
              },
              isDiffHidden: {
                type: 'boolean',
                description: 'Whether to hide the diff between this update and the previous one'
              }
            },
            required: ['projectId']
          }
        },
        {
          name: 'get_documents',
          description: 'Get a list of Linear documents with optional name filtering and pagination\n\nExamples:\n1. Basic usage: {}\n2. Filter by name: {nameFilter: \"meeting notes\"}\n3. Include archived: {includeArchived: true, nameFilter: \"roadmap\"}\n4. Pagination: {first: 25, after: \"cursor-from-previous-response\"}\n5. Filter by project: {projectId: \"project-123\"}\n6. Filter by team: {teamId: \"team-abc\"}\n\nReturns a paginated list of documents with metadata including:\n- Document details (id, title, content preview, etc.)\n- Creator information\n- Last editor information  \n- Project and team associations\n- Creation and update timestamps',
          inputSchema: {
            type: 'object',
            properties: {
              nameFilter: {
                type: 'string',
                description: 'Optional filter to search by document title'
              },
              includeArchived: {
                type: 'boolean',
                description: 'Whether to include archived documents (default: true)',
                default: true
              },
              teamId: {
                type: 'string',
                description: 'Filter documents by team ID'
              },
              projectId: {
                type: 'string',
                description: 'Filter documents by project ID'
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
            }
          }
        },
        {
          name: 'get_document',
          description: 'Get detailed information about a specific Linear document\n\nReturns comprehensive document information including:\n- Full document content in markdown format\n- Metadata (creation date, last edited date, etc.)\n- Creator and editor information\n- Team and project associations\n- Document URL\n\nYou can retrieve a document using either its ID or its URL slug.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: 'The ID of the Linear document'
              },
              documentSlug: {
                type: 'string',
                description: 'The URL slug of the document (alternative to documentId)'
              },
              includeFull: {
                type: 'boolean',
                description: 'Whether to include the full document content (default: true)',
                default: true
              }
            },
            required: ['documentId']
          }
        },
        {
          name: 'create_document',
          description: 'Create a new document in Linear\n\nExamples:\n1. Basic document: {teamId: \"team-123\", title: \"Meeting Notes\", content: \"# Meeting Notes\\n\\nDiscussion points...\"}\n2. Project document: {teamId: \"team-123\", projectId: \"project-abc\", title: \"Design Spec\"}\n3. With icon: {teamId: \"team-123\", title: \"Design System\", icon: \"🎨\", content: \"...\"}\n\nReturns the newly created document with its ID, URL, and other metadata.',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: {
                type: 'string',
                description: 'ID of the team this document belongs to'
              },
              title: {
                type: 'string',
                description: 'Title of the document'
              },
              content: {
                type: 'string',
                description: 'Content of the document in markdown format'
              },
              icon: {
                type: 'string',
                description: 'Emoji icon for the document'
              },
              projectId: {
                type: 'string',
                description: 'ID of the project to associate this document with'
              },
              isPublic: {
                type: 'boolean',
                description: 'Whether the document should be accessible outside the organization (default: false)',
                default: false
              }
            },
            required: ['teamId', 'title']
          }
        },
        {
          name: 'update_document',
          description: 'Update an existing Linear document\n\nExamples:\n1. Update content: {documentId: \"doc-123\", content: \"# Updated Content\"}\n2. Update title: {documentId: \"doc-123\", title: \"New Title\"}\n3. Change icon: {documentId: \"doc-123\", icon: \"🚀\"}\n4. Change project: {documentId: \"doc-123\", projectId: \"project-456\"}\n5. Archive: {documentId: \"doc-123\", isArchived: true}\n\nYou only need to include the fields you want to update. Returns the updated document with its new values.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: 'ID of the document to update'
              },
              title: {
                type: 'string',
                description: 'New title for the document'
              },
              content: {
                type: 'string',
                description: 'New content for the document in markdown format'
              },
              icon: {
                type: 'string',
                description: 'New emoji icon for the document'
              },
              projectId: {
                type: 'string',
                description: 'ID of the project to move this document to'
              },
              teamId: {
                type: 'string',
                description: 'ID of the team to move this document to'
              },
              isArchived: {
                type: 'boolean',
                description: 'Whether the document should be archived'
              },
              isPublic: {
                type: 'boolean',
                description: 'Whether the document should be accessible outside the organization'
              }
            },
            required: ['documentId']
          }
        },
        {
          name: 'delete_document',
          description: 'Delete an existing Linear document\n\nThis action permanently removes the document from Linear and cannot be undone. Returns a success message when the document is successfully deleted.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: 'ID of the document to delete'
              }
            },
            required: ['documentId']
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
          case 'create_project_update':
            return await this.handleCreateProjectUpdate(request.params.arguments);
          case 'get_documents':
            return await this.handleGetDocuments(request.params.arguments);
          case 'get_document':
            return await this.handleGetDocument(request.params.arguments);
          case 'create_document':
            return await this.handleCreateDocument(request.params.arguments);
          case 'update_document':
            return await this.handleUpdateDocument(request.params.arguments);
          case 'delete_document':
            return await this.handleDeleteDocument(request.params.arguments);
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
          text: JSON.stringify(projectUpdates, null, 2)
        }
      ]
    };
  }

  private async handleCreateProjectUpdate(args: unknown) {
    if (!isCreateProjectUpdateArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid create_project_update arguments'
      );
    }

    const projectUpdate = await this.linearAPI.createProjectUpdate(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projectUpdate, null, 2)
        }
      ]
    };
  }

  private async handleGetDocuments(args: unknown) {
    if (!isGetDocumentsArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid get_documents arguments'
      );
    }

    const documents = await this.linearAPI.getDocuments(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(documents, null, 2)
        }
      ]
    };
  }

  private async handleGetDocument(args: unknown) {
    if (!isGetDocumentArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid get_document arguments'
      );
    }

    const document = await this.linearAPI.getDocument(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(document, null, 2)
        }
      ]
    };
  }

  private async handleCreateDocument(args: unknown) {
    if (!isCreateDocumentArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid create_document arguments'
      );
    }

    const document = await this.linearAPI.createDocument(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(document, null, 2)
        }
      ]
    };
  }

  private async handleUpdateDocument(args: unknown) {
    if (!isUpdateDocumentArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid update_document arguments'
      );
    }

    const document = await this.linearAPI.updateDocument(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(document, null, 2)
        }
      ]
    };
  }

  private async handleDeleteDocument(args: unknown) {
    if (!isDeleteDocumentArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid delete_document arguments'
      );
    }

    const result = await this.linearAPI.deleteDocument(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
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
