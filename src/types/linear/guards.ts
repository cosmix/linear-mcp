import { GetTeamsArgs } from './team';
import { GetIssueArgs } from './issue';
import { SearchIssuesArgs } from './search';
import { CreateIssueArgs, UpdateIssueArgs, DeleteIssueArgs } from './issue';
import { CreateCommentArgs } from './comment';
import { GetProjectsArgs, GetProjectUpdatesArgs, CreateProjectUpdateArgs, ProjectUpdateHealthType } from './project';
import { CycleFilter, isCycleFilter } from './cycle';

export const isGetTeamsArgs = (args: unknown): args is GetTeamsArgs =>
  typeof args === 'object' &&
  args !== null &&
  (typeof (args as GetTeamsArgs).nameFilter === 'undefined' || 
   typeof (args as GetTeamsArgs).nameFilter === 'string');

export const isGetIssueArgs = (args: unknown): args is GetIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as GetIssueArgs).issueId === 'string';

export const isSearchIssuesArgs = (args: unknown): args is SearchIssuesArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as SearchIssuesArgs).query === 'string' &&
  (typeof (args as SearchIssuesArgs).filter === 'undefined' ||
    (typeof (args as SearchIssuesArgs).filter === 'object' &&
      (args as SearchIssuesArgs).filter !== null &&
      (typeof (args as SearchIssuesArgs).filter!.assignedTo === 'undefined' ||
        typeof (args as SearchIssuesArgs).filter!.assignedTo === 'string') &&
      (typeof (args as SearchIssuesArgs).filter!.createdBy === 'undefined' ||
        typeof (args as SearchIssuesArgs).filter!.createdBy === 'string') &&
      (typeof (args as SearchIssuesArgs).filter!.cycle === 'undefined' ||
        isCycleFilter((args as SearchIssuesArgs).filter!.cycle)))) &&
  (typeof (args as SearchIssuesArgs).projectId === 'undefined' ||
    typeof (args as SearchIssuesArgs).projectId === 'string') &&
  (typeof (args as SearchIssuesArgs).projectName === 'undefined' ||
    typeof (args as SearchIssuesArgs).projectName === 'string');

export const isCreateIssueArgs = (args: unknown): args is CreateIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as CreateIssueArgs).title === 'string' &&
  (typeof (args as CreateIssueArgs).teamId === 'undefined' || typeof (args as CreateIssueArgs).teamId === 'string') &&
  (typeof (args as CreateIssueArgs).description === 'undefined' || typeof (args as CreateIssueArgs).description === 'string') &&
  (typeof (args as CreateIssueArgs).parentId === 'undefined' || typeof (args as CreateIssueArgs).parentId === 'string') &&
  (typeof (args as CreateIssueArgs).status === 'undefined' || typeof (args as CreateIssueArgs).status === 'string') &&
  (typeof (args as CreateIssueArgs).priority === 'undefined' || typeof (args as CreateIssueArgs).priority === 'number') &&
  (typeof (args as CreateIssueArgs).assigneeId === 'undefined' || typeof (args as CreateIssueArgs).assigneeId === 'string') &&
  (typeof (args as CreateIssueArgs).labelIds === 'undefined' || (Array.isArray((args as CreateIssueArgs).labelIds) && 
    (args as CreateIssueArgs).labelIds!.every(id => typeof id === 'string'))) &&
  // Ensure either teamId or parentId is provided
  ((args as CreateIssueArgs).teamId !== undefined || (args as CreateIssueArgs).parentId !== undefined);

export const isDeleteIssueArgs = (args: unknown): args is DeleteIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as DeleteIssueArgs).issueId === 'string';

export const isUpdateIssueArgs = (args: unknown): args is UpdateIssueArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as UpdateIssueArgs).issueId === 'string' &&
  (typeof (args as UpdateIssueArgs).title === 'undefined' || typeof (args as UpdateIssueArgs).title === 'string') &&
  (typeof (args as UpdateIssueArgs).description === 'undefined' || typeof (args as UpdateIssueArgs).description === 'string') &&
  (typeof (args as UpdateIssueArgs).status === 'undefined' || typeof (args as UpdateIssueArgs).status === 'string') &&
  (typeof (args as UpdateIssueArgs).priority === 'undefined' || typeof (args as UpdateIssueArgs).priority === 'number') &&
  (typeof (args as UpdateIssueArgs).assigneeId === 'undefined' || typeof (args as UpdateIssueArgs).assigneeId === 'string') &&
  (typeof (args as UpdateIssueArgs).labelIds === 'undefined' || (Array.isArray((args as UpdateIssueArgs).labelIds) && 
    (args as UpdateIssueArgs).labelIds!.every(id => typeof id === 'string')));

export const isCreateCommentArgs = (args: unknown): args is CreateCommentArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as CreateCommentArgs).issueId === 'string' &&
  typeof (args as CreateCommentArgs).body === 'string';

export const isGetProjectsArgs = (args: unknown): args is GetProjectsArgs =>
  typeof args === 'object' &&
  args !== null &&
  (typeof (args as GetProjectsArgs).nameFilter === 'undefined' || 
   typeof (args as GetProjectsArgs).nameFilter === 'string') &&
  (typeof (args as GetProjectsArgs).includeArchived === 'undefined' || 
   typeof (args as GetProjectsArgs).includeArchived === 'boolean') &&
  (typeof (args as GetProjectsArgs).first === 'undefined' || 
   typeof (args as GetProjectsArgs).first === 'number') &&
  (typeof (args as GetProjectsArgs).after === 'undefined' || 
   typeof (args as GetProjectsArgs).after === 'string');

export const isGetProjectUpdatesArgs = (args: unknown): args is GetProjectUpdatesArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as GetProjectUpdatesArgs).projectId === 'string' &&
  (typeof (args as GetProjectUpdatesArgs).includeArchived === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).includeArchived === 'boolean') &&
  (typeof (args as GetProjectUpdatesArgs).first === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).first === 'number') &&
  (typeof (args as GetProjectUpdatesArgs).after === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).after === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).createdAfter === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).createdAfter === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).createdBefore === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).createdBefore === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).userId === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).userId === 'string') &&
  (typeof (args as GetProjectUpdatesArgs).health === 'undefined' || 
   typeof (args as GetProjectUpdatesArgs).health === 'string');

export const isCreateProjectUpdateArgs = (args: unknown): args is CreateProjectUpdateArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof (args as CreateProjectUpdateArgs).projectId === 'string' &&
  (typeof (args as CreateProjectUpdateArgs).body === 'undefined' || 
   typeof (args as CreateProjectUpdateArgs).body === 'string') &&
  (typeof (args as CreateProjectUpdateArgs).health === 'undefined' || 
   Object.values(ProjectUpdateHealthType).includes((args as CreateProjectUpdateArgs).health as any)) &&
  (typeof (args as CreateProjectUpdateArgs).isDiffHidden === 'undefined' || 
   typeof (args as CreateProjectUpdateArgs).isDiffHidden === 'boolean');
