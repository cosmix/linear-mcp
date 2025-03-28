import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { LinearIssueSearchResult } from '../../types/linear/issue';
import { SearchIssuesArgs } from '../../types/linear/search';
import { LinearBaseService, LinearClientInterface } from './base-service';
import { CycleService } from './cycle-service';
import { ProjectService } from './project-service';

export class SearchService extends LinearBaseService {
  private cycleService: CycleService;
  private projectService: ProjectService;

  constructor(clientOrApiKey: string | LinearClientInterface) {
    super(clientOrApiKey);
    this.cycleService = new CycleService(this.client);
    this.projectService = new ProjectService(this.client);
  }

  /**
   * Resolves user references in filters (e.g., 'me' to current user ID)
   * @param filter The filter to resolve user references in
   * @returns The filter with resolved user references
   */
  private async resolveUserReferences(filter: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resolvedFilter = { ...filter };
    let currentUser: any = null;

    // Helper function to resolve 'me' references
    const resolveMe = async (value: unknown): Promise<unknown> => {
      if (value === 'me') {
        if (!currentUser) {
          currentUser = await this.getCurrentUser();
        }
        return currentUser.id;
      }
      return value;
    };

    // Resolve user references in comparators
    const resolveComparators = async (comparators: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(comparators)) {
        if (value === 'me') {
          resolved[key] = await resolveMe(value);
        } else if (Array.isArray(value)) {
          resolved[key] = await Promise.all(value.map(v => resolveMe(v)));
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    };

    // Recursively resolve user references in filters
    const resolveFilters = async (obj: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          if (key === 'assignee' || key === 'creator') {
            const userFilter = value as Record<string, unknown>;
            if (userFilter.id && typeof userFilter.id === 'object') {
              resolved[key] = {
                ...userFilter,
                id: await resolveComparators(userFilter.id as Record<string, unknown>)
              };
            } else {
              resolved[key] = value;
            }
          } else if (key === 'and' || key === 'or') {
            const arrayValue = value as Record<string, unknown>[];
            resolved[key] = await Promise.all(arrayValue.map(v => resolveFilters(v)));
          } else {
            resolved[key] = await resolveFilters(value as Record<string, unknown>);
          }
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    };

    return resolveFilters(resolvedFilter);
  }

  /**
   * Searches for issues based on query and filters
   * @param args The search arguments
   * @returns List of matching issues
   */
  async searchIssues(args: SearchIssuesArgs): Promise<LinearIssueSearchResult[]> {
    try {
      // Build filter conditions
      const conditions: Record<string, unknown>[] = [];

      // Add search query condition if provided
      if (args.query) {
        conditions.push({
          or: [
            { title: { contains: args.query } },
            { description: { contains: args.query } },
          ] as Record<string, unknown>[],
        });
      }

      // Handle project filtering (backward compatibility)
      if (args.projectId || args.projectName) {
        // If projectName is provided but not projectId, try to find the project by name
        if (!args.projectId && args.projectName) {
          const projects = await this.projectService.getProjects({ 
            nameFilter: args.projectName, 
            first: 2,
            after: undefined,
            includeArchived: true 
          });
          
          if (projects.projects.length === 0) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `No projects found matching name: ${args.projectName}`
            );
          }
          
          if (projects.projects.length > 1) {
            const projectNames = projects.projects.map(p => `"${p.name}" (${p.id})`).join(', ');
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Multiple projects match name "${args.projectName}": ${projectNames}. Please use projectId instead.`
            );
          }
          
          // Exactly one match found, use its ID
          args.projectId = projects.projects[0].id;
        }
        
        // Add project filter condition
        conditions.push({
          project: {
            id: { eq: args.projectId }
          } as Record<string, unknown>
        });
      }

      // Handle advanced filters
      if (args.filter) {
        const { assignedTo, createdBy, and, or, cycle, ...fieldFilters } = args.filter;

        // Handle backward compatibility filters
        if (assignedTo) {
          conditions.push({
            assignee: {
              id: { eq: assignedTo }
            } as Record<string, unknown>
          });
        }

        if (createdBy) {
          conditions.push({
            creator: {
              id: { eq: createdBy }
            } as Record<string, unknown>
          });
        }

        // Handle cycle filtering
        if (cycle) {
          try {
            // Resolve the cycle filter to a specific cycle ID
            const cycleId = await this.cycleService.resolveCycleFilter(cycle);
            
            // Add cycle condition to the filter
            // Make sure cycleId is a string
            if (typeof cycleId === 'string') {
              conditions.push({
                cycle: {
                  id: { eq: cycleId }
                } as Record<string, unknown>
              });
            } else {
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Invalid cycle ID: ${cycleId}. Expected a string.`
              );
            }
          } catch (error) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Failed to resolve cycle filter: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        // Handle field filters
        if (Object.keys(fieldFilters).length > 0) {
          conditions.push(fieldFilters as Record<string, unknown>);
        }

        // Handle logical operators
        if (and) {
          conditions.push({ and: and as Record<string, unknown>[] });
        }

        if (or) {
          conditions.push({ or: or as Record<string, unknown>[] });
        }
      }

      // Combine all conditions with AND
      let filter: Record<string, unknown> | undefined = conditions.length > 0 
        ? { and: conditions }
        : undefined;

      // Resolve any 'me' references in the filter
      if (filter) {
        filter = await this.resolveUserReferences(filter);
      }

      const issues = await this.client.issues({ filter });

      return Promise.all(
        issues.nodes.map(async (issue) => {
          const [state, assignee, team, labels] = await Promise.all([
            issue.state,
            issue.assignee,
            issue.team,
            issue.labels(),
          ]);
          
          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            status: state?.name,
            assignee: assignee?.name,
            priority: issue.priority,
            teamName: team?.name,
            labels: labels.nodes.map(label => label.name),
          };
        })
      );
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
