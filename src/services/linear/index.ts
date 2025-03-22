import { LinearBaseService, LinearClientInterface } from './base-service';
import { TeamService } from './team-service';
import { CycleService } from './cycle-service';
import { IssueService } from './issue-service';
import { CommentService } from './comment-service';
import { ProjectService } from './project-service';
import { SearchService } from './search-service';
import { extractMentions, cleanDescription, getComments, getRelationships } from './utils';

/**
 * Main Linear API service that combines all specialized services
 */
export class LinearAPIService {
  private client: LinearClientInterface;
  private teamService: TeamService;
  private cycleService: CycleService;
  private issueService: IssueService;
  private commentService: CommentService;
  private projectService: ProjectService;
  private searchService: SearchService;

  constructor(clientOrApiKey: string | LinearClientInterface) {
    // Initialize the client
    if (typeof clientOrApiKey === 'string') {
      if (!clientOrApiKey) {
        throw new Error('LINEAR_API_KEY is required');
      }
      // We'll initialize the client in each service
      this.client = null as any;
    } else {
      this.client = clientOrApiKey;
    }

    // Initialize all services
    this.teamService = new TeamService(clientOrApiKey);
    this.cycleService = new CycleService(clientOrApiKey);
    this.issueService = new IssueService(clientOrApiKey);
    this.commentService = new CommentService(clientOrApiKey);
    this.projectService = new ProjectService(clientOrApiKey);
    this.searchService = new SearchService(clientOrApiKey);
  }

  // Team operations
  async getTeams(args: import('../../types').GetTeamsArgs) {
    return this.teamService.getTeams(args);
  }

  // Issue operations
  async getIssue(args: import('../../types').GetIssueArgs) {
    return this.issueService.getIssue(args);
  }

  async createIssue(args: import('../../types').CreateIssueArgs) {
    return this.issueService.createIssue(args);
  }

  async updateIssue(args: import('../../types').UpdateIssueArgs) {
    return this.issueService.updateIssue(args);
  }

  async deleteIssue(args: import('../../types').DeleteIssueArgs) {
    return this.issueService.deleteIssue(args);
  }

  // Comment operations
  async createComment(args: import('../../types').CreateCommentArgs) {
    return this.commentService.createComment(args);
  }

  // Project operations
  async getProjects(args: import('../../types').GetProjectsArgs) {
    return this.projectService.getProjects(args);
  }

  async getProjectUpdates(args: import('../../types').GetProjectUpdatesArgs) {
    return this.projectService.getProjectUpdates(args);
  }

  async createProjectUpdate(args: import('../../types').CreateProjectUpdateArgs) {
    return this.projectService.createProjectUpdate(args);
  }

  // Search operations
  async searchIssues(args: import('../../types').SearchIssuesArgs) {
    return this.searchService.searchIssues(args);
  }

  // Cycle operations
  async resolveCycleFilter(filter: import('../../types').CycleFilter) {
    return this.cycleService.resolveCycleFilter(filter);
  }

  // Utility methods
  async getCurrentUser() {
    // We can use any service instance to get the current user
    return (this.teamService as any).getCurrentUser();
  }
}

// Export all services and utilities
export {
  LinearBaseService,
  TeamService,
  CycleService,
  IssueService,
  CommentService,
  ProjectService,
  SearchService,
  extractMentions,
  cleanDescription,
  getComments,
  getRelationships
};
