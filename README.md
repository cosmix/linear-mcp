# Linear MCP Server

A Model Context Protocol (MCP) server implementation that provides access to Linear's issue tracking system through a standardized interface.

## Features

* Create new issues and subissues with label support
* Retrieve the list of linear projects
* Retrieve the project updates
* Create a new project update with health status
* Update existing issues with full field modification
* Delete issue with validation
* Self-assign issues using 'me' keyword
* Advanced search with Linear's powerful filtering capabilities
* Add comments to issues with markdown support
* Query Linear issues by ID or key with optional relationships
* Search issues using custom queries with enhanced metadata
* Type-safe operations using Linear's official SDK
* Comprehensive error handling
* Rate limit handling
* Clean data transformation
* Parent/child relationship tracking with team inheritance
* Label management and synchronization

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0.0 or higher)
- Linear account with API access

## Environment Variables

```bash
LINEAR_API_KEY=your_api_key  # Your Linear API token
```

## Installation & Setup

### 1. Clone the repository:

```bash
git clone [repository-url]
cd linear-mcp
```

### 2. Install dependencies and build:

```bash
bun install
bun run build
```

### 3. Configure the MCP server:

Edit the appropriate configuration file:

**macOS:**
* Cline: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
* Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:**
* Cline: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
* Claude Desktop: `%APPDATA%\Claude Desktop\claude_desktop_config.json`

**Linux:**
* Cline: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
* Claude Desktop: _sadly doesn't exist yet_

Add the following configuration under the `mcpServers` object:

```json
{
  "mcpServers": {
    "linear": {
      "command": "node",
      "args": ["/absolute/path/to/linear-mcp/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "your_api_key"
      }
    }
  }
}
```

### 4. Restart the MCP server.

Within Cline's MCP settings, restart the MCP server. Restart Claude Desktop to load the new MCP server.

## Development

Run development server:
```bash
bun run dev
```

Build project:
```bash
bun run build
```

## Available MCP Tools

### create_issue

Create a new Linear issue or subissue.

Input Schema:
```json
{
  "teamId": "string",     
  "title": "string",      
  "description": "string",
  "parentId": "string",   
  "status": "string",
  "priority": "number",   
  "assigneeId": "string | 'me'",
  "labelIds": ["string"]  
}
```

Example creating a new issue:
```json
{
  "teamId": "team-123",
  "title": "New Feature Request"
}
```

Example creating a self-assigned issue:
```json
{
  "teamId": "team-123",
  "title": "My Task",
  "assigneeId": "me"
}
```

Example creating a subissue:
```json
{
  "parentId": "ISSUE-123",
  "title": "Subtask"
}
```

### update_issue

Update an existing Linear issue.

Input Schema:
```json
{
  "issueId": "string",    
  "title": "string",      
  "description": "string",
  "status": "string",     
  "priority": "number",   
  "assigneeId": "string | 'me'",
  "labelIds": ["string"]  
}
```

Example self-assigning an issue:
```json
{
  "issueId": "ISSUE-123",
  "assigneeId": "me"
}
```

### get_issue

Get detailed information about a specific Linear issue with optional relationships.

Input Schema:
```json
{
  "issueId": "string",
  "includeRelationships": "boolean"  
}
```

### search_issues

Search for Linear issues using a query string and advanced filters. Supports Linear's powerful filtering capabilities.

Input Schema:
```json
{
  "query": "string",
  "includeRelationships": "boolean",
  "filter": {
    "title": { "contains": "string", "eq": "string", ... },
    "description": { "contains": "string", "eq": "string", ... },
    "priority": { "gte": "number", "lt": "number", ... },
    "estimate": { "eq": "number", "in": ["number"], ... },
    "dueDate": { "lt": "string", "gt": "string", ... },
    "createdAt": { "gt": "P2W", "lt": "2024-01-01", ... },
    "updatedAt": { "gt": "P1M", ... },
    "completedAt": { "null": true, ... },
    "assignee": { "id": { "eq": "string" }, "name": { "contains": "string" } },
    "creator": { "id": { "eq": "string" }, "name": { "contains": "string" } },
    "team": { "id": { "eq": "string" }, "key": { "eq": "string" } },
    "state": { "type": { "eq": "started" }, "name": { "eq": "string" } },
    "labels": { "name": { "in": ["string"] }, "every": { "name": { "eq": "string" } } },
    "project": { "id": { "eq": "string" }, "name": { "contains": "string" } },
    "and": [{ /* filters */ }],
    "or": [{ /* filters */ }],
    "assignedTo": "string | 'me'",
    "createdBy": "string | 'me'"
  },
  "projectId": "string",
  "projectName": "string"
}
```

Supported Comparators:
- String fields: `eq`, `neq`, `in`, `nin`, `contains`, `startsWith`, `endsWith` (plus case-insensitive variants)
- Number fields: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in`, `nin`
- Date fields: `eq`, `neq`, `lt`, `lte`, `gt`, `gte` (supports ISO 8601 durations)

Examples:

Basic search:
```json
{
  "query": "bug"
}
```

High priority issues:
```json
{
  "query": "",
  "filter": {
    "priority": { "gte": 2 }
  }
}
```

Issues due soon:
```json
{
  "query": "",
  "filter": {
    "dueDate": { "lt": "P2W" }
  }
}
```

Issues with specific labels:
```json
{
  "query": "",
  "filter": {
    "labels": {
      "name": { "in": ["Bug", "Critical"] }
    }
  }
}
```

Complex filters:
```json
{
  "query": "",
  "filter": {
    "and": [
      { "priority": { "gte": 2 } },
      { "state": { "type": { "eq": "started" } } }
    ],
    "or": [
      { "assignee": { "id": { "eq": "me" } } },
      { "creator": { "id": { "eq": "me" } } }
    ]
  }
}
```

Issues in a project:
```json
{
  "query": "",
  "filter": {
    "project": {
      "id": { "eq": "project-id" }
    }
  }
}
```

Issues by state type:
```json
{
  "query": "",
  "filter": {
    "state": {
      "type": { "eq": "started" }
    }
  }
}
```

Backward compatibility examples:

Self-assigned issues:
```json
{
  "query": "",
  "filter": {
    "assignedTo": "me"
  }
}
```

Issues created by you:
```json
{
  "query": "",
  "filter": {
    "createdBy": "me"
  }
}
```

Issues assigned to a specific user:
```json
{
  "query": "",
  "filter": {
    "assignedTo": "user-id-123"
  }
}
```

Issues in a specific project:
```json
{
  "query": "bug",
  "projectId": "project-123"
}
```

Issues by project name:
```json
{
  "query": "feature",
  "projectName": "Website Redesign"
}
```

### get_teams

Get a list of Linear teams with optional name/key filtering.

Input Schema:
```json
{
  "nameFilter": "string"  
}
```

### delete_issue

Delete an existing Linear issue.

Input Schema:
```json
{
  "issueId": "string"
}
```

### create_comment

Create a new comment on a Linear issue.

Input Schema:
```json
{
  "issueId": "string",
  "body": "string"
}
```

### get_projects

Get a list of Linear projects with optional name filtering and pagination.

Input Schema:
```json
{
  "nameFilter": "string",
  "includeArchived": "boolean",
  "first": "number",
  "after": "string"
}
```

Example fetching all projects:
```json
{}
```

Example searching for projects by name:
```json
{
  "nameFilter": "Website"
}
```

Example with pagination:
```json
{
  "first": 10,
  "after": "cursor-from-previous-response"
}
```

### get_project_updates

Get project updates for a given project ID with optional filtering parameters.

Input Schema:
```json
{
  "projectId": "string",
  "includeArchived": "boolean",
  "first": "number",
  "after": "string",
  "createdAfter": "string",
  "createdBefore": "string",
  "userId": "string | 'me'",
  "health": "string"
}
```

Example fetching updates for a project:
```json
{
  "projectId": "project-123"
}
```

Example filtering by date range:
```json
{
  "projectId": "project-123",
  "createdAfter": "2023-01-01T00:00:00Z",
  "createdBefore": "2023-12-31T23:59:59Z"
}
```

Example filtering by creator (self):
```json
{
  "projectId": "project-123",
  "userId": "me"
}
```

Example filtering by health status:
```json
{
  "projectId": "project-123",
  "health": "atRisk"
}
```

### create_project_update

Create a new update for a Linear project.

Input Schema:
```json
{
  "projectId": "string",
  "body": "string",
  "health": "onTrack | atRisk | offTrack",
  "isDiffHidden": "boolean"
}
```

Example creating a basic project update:
```json
{
  "projectId": "project-123",
  "body": "Sprint completed successfully with all planned features delivered."
}
```

Example with health status:
```json
{
  "projectId": "project-123",
  "body": "Sprint progress is slower than expected due to technical challenges.",
  "health": "atRisk"
}
```

Example with hidden diff:
```json
{
  "projectId": "project-123",
  "body": "Project kickoff meeting completed.",
  "health": "onTrack",
  "isDiffHidden": true
}
```

## Technical Details

* Built with TypeScript in strict mode
* Uses Linear's official SDK (@linear/sdk)
* Uses MCP SDK (@modelcontextprotocol/sdk 1.4.0)
* Authentication via API tokens
* Comprehensive error handling
* Rate limiting considerations
* Bun runtime for improved performance
* ESM modules throughout
* Vite build system
* Type-safe operations
* Data cleaning features:
  * Issue mention extraction (ABC-123 format)
  * User mention extraction (@username format)
  * Markdown content cleaning
  * Content optimization for AI context
* Self-assignment support:
  * Automatic current user resolution
  * 'me' keyword support in create/update operations
  * Efficient user ID caching
* Advanced search capabilities:
  * Comprehensive filtering with Linear's API
  * Support for all field comparators
  * Relationship filtering
  * Logical operators (and, or)
  * Relative date filtering
  * Filter by assignee/creator (including self)
  * Support for specific user IDs
  * Project filtering by ID or name
  * Efficient query optimization
* Project management features:
  * Project listing with filtering and pagination
  * Project update creation with health status tracking
  * Project update retrieval with filtering options

## Error Handling

The server implements a comprehensive error handling strategy:

* Network error detection and appropriate messaging
* HTTP status code handling
* Detailed error messages with status codes
* Error details logging to console
* Input validation for all parameters
* Label validation and synchronization
* Safe error propagation through MCP protocol
* Rate limit detection and handling
* Authentication error handling
* Invalid query handling
* Team inheritance validation for subissues
* User resolution validation
* Search filter validation

## LICENCE

This project is licensed under the MIT License - see the [LICENCE](LICENCE) file for details.
