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
* Filter issues by cycle (current, next, previous, or specific cycle by UUID or number)
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

For detailed usage examples of all tools, see [USAGE.md](USAGE.md).

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

### update_issue

Update an existing Linear issue.

Input Schema:
```json
{
  "issueId": "string",    
  "title": "string",
  "description": "string",
  "status": "string",     // Expects status NAME (e.g., "In Progress"). Must be valid for the issue's team.
  "priority": "number",   // Expects 0 (None) to 4 (Low).
  "assigneeId": "string | 'me'",
  "labelIds": ["string"],
  "cycleId": "string"
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
