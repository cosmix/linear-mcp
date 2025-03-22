# Linear MCP Examples

This file contains examples for using the Linear MCP server tools.

## create_issue

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

## update_issue

Example self-assigning an issue:
```json
{
  "issueId": "ISSUE-123",
  "assigneeId": "me"
}
```

Example updating an issue's cycle with a direct ID:
```json
{
  "issueId": "ISSUE-123",
  "cycleId": "cycle-abc123"
}
```

Two-step process to move an issue to a specific cycle type:

1. First, resolve the cycle ID using the appropriate filter:
```javascript
// Get the current cycle ID
const cycleFilter = {
  type: "current",
  teamId: "team-123"
};
// Use resolveCycleFilter through search_issues or other appropriate method
// The API will return the actual cycle ID (e.g., "cycle-abc123")
```

2. Then update the issue with the resolved cycle ID:
```json
{
  "issueId": "ISSUE-123",
  "cycleId": "[resolved-cycle-id]"
}
```

## search_issues

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

Issues in the current cycle:
```json
{
  "query": "",
  "filter": {
    "cycle": {
      "type": "current",
      "teamId": "team-123"
    }
  }
}
```

Issues in the next cycle:
```json
{
  "query": "",
  "filter": {
    "cycle": {
      "type": "next",
      "teamId": "team-123"
    }
  }
}
```

Issues in the previous cycle:
```json
{
  "query": "",
  "filter": {
    "cycle": {
      "type": "previous",
      "teamId": "team-123"
    }
  }
}
```

Issues in a specific cycle by UUID:
```json
{
  "query": "",
  "filter": {
    "cycle": {
      "type": "specific",
      "id": "cycle-456"
    }
  }
}
```

Issues in a specific cycle by cycle number:
```json
{
  "query": "",
  "filter": {
    "cycle": {
      "type": "specific",
      "id": "2",
      "teamId": "team-123"
    }
  }
}
```

High priority bugs in the current cycle assigned to me:
```json
{
  "query": "bug",
  "filter": {
    "and": [
      {
        "cycle": {
          "type": "current",
          "teamId": "team-123"
        }
      },
      {
        "priority": { "gte": 2 }
      }
    ],
    "assignee": {
      "id": { "eq": "me" }
    }
  }
}
```

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

Cycle Filtering:
```json
{
  "query": "",
  "filter": {
    "cycle": {
      "type": "current", // or "next", "previous", "specific"
      "teamId": "team-123", // Required for current, next, previous, and when using cycle number with specific
      "id": "456" // Required for "specific" type (can be UUID or cycle number)
    }
  }
}
```

## get_projects

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

## get_project_updates

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

## create_project_update

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
