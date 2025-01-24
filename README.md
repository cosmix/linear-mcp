# Linear MCP Server

A Model Context Protocol (MCP) server implementation that provides access to Linear's issue tracking system through a standardized interface.

<a href="https://glama.ai/mcp/servers/83wkbjoqvn"><img width="380" height="200" src="https://glama.ai/mcp/servers/83wkbjoqvn/badge" alt="Linear Server MCP server" /></a>

## Features

* Query Linear issues by ID or key
* Search issues using custom queries
* Type-safe operations using Linear's official SDK
* Comprehensive error handling
* Rate limit handling
* Clean data transformation

## Prerequisites

* Bun runtime
* TypeScript
* Linear account with API access

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

### get_issue

Get detailed information about a specific Linear issue.

Input Schema:
```json
{
  "issueId": "string"
}
```

### search_issues

Search for Linear issues using a query string.

Input Schema:
```json
{
  "query": "string" 
}
```

## Technical Details

* Built with TypeScript in strict mode
* Uses Linear's official SDK
* Authentication via API tokens
* Comprehensive error handling
* Rate limiting considerations
* Bun runtime for improved performance
* ESM modules throughout
* Vite build system
* Type-safe operations

## Error Handling

The server implements a comprehensive error handling strategy:

* Network error detection and appropriate messaging
* HTTP status code handling
* Detailed error messages with status codes
* Error details logging to console
* Input validation for all parameters
* Safe error propagation through MCP protocol
* Rate limit detection and handling
* Authentication error handling
* Invalid query handling

## LICENCE

This project is licensed under the MIT License - see the [LICENCE](LICENCE) file for details.
