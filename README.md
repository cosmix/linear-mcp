# Linear MCP Server

A Model Context Protocol (MCP) server implementation that provides access to Linear's issue tracking system through a standardized interface.

## Features

* Create new issues and subissues with label support
* Update existing issues with full field modification
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
  "description": "string"
  "parentId": "string",   
  "status": "string",
  "priority": "number",   
  "assigneeId": "string",
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
  "assigneeId": "string", 
  "labelIds": ["string"]  
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

Search for Linear issues using a query string.

Input Schema:
```json
{
  "query": "string",
  "includeRelationships": "boolean"  
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

## LICENCE

This project is licensed under the MIT License - see the [LICENCE](LICENCE) file for details.
