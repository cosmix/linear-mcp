# Linear MCP Server

A Model Context Protocol (MCP) server implementation that provides access to Linear's issue tracking system through a standardized interface.

## Features

* Create new issues and subissues with label support
* Retrieve the list of linear projects
* Retrieve the project updates
* Update existing issues with full field modification
* Delete issue with validation
* Self-assign issues using 'me' keyword
* Advanced search by creator and assignee
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

Search for Linear issues using a query string with advanced filtering.

Input Schema:
```json
{
  "query": "string",
  "includeRelationships": "boolean",
  "filter": {
    "assignedTo": "string | 'me'",
    "createdBy": "string | 'me'"
  }
}
```

Example searching for self-assigned issues:
```json
{
  "query": "",
  "filter": {
    "assignedTo": "me"
  }
}
```

Example searching for issues created by you:
```json
{
  "query": "",
  "filter": {
    "createdBy": "me"
  }
}
```

Example searching for issues assigned to a specific user:
```json
{
  "query": "",
  "filter": {
    "assignedTo": "user-id-123"
  }
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
  * Filter by assignee (including self)
  * Filter by creator (including self)
  * Support for specific user IDs
  * Efficient query optimization

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
