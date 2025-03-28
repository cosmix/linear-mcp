import { DateComparators, NumberComparators, StringComparators } from './base';
import { CycleFilter } from './cycle';

// Issue field filters
export interface IssueFieldFilters {
  title?: StringComparators;
  description?: StringComparators;
  priority?: NumberComparators;
  estimate?: NumberComparators;
  dueDate?: DateComparators;
  createdAt?: DateComparators;
  updatedAt?: DateComparators;
  completedAt?: DateComparators;
  startedAt?: DateComparators;
  canceledAt?: DateComparators;
  // Relationship filters
  assignee?: { id?: StringComparators; name?: StringComparators };
  creator?: { id?: StringComparators; name?: StringComparators };
  team?: { id?: StringComparators; name?: StringComparators; key?: StringComparators };
  state?: { id?: StringComparators; name?: StringComparators; type?: StringComparators };
  labels?: { name?: StringComparators; every?: { name?: StringComparators } };
  project?: { id?: StringComparators; name?: StringComparators };
  cycle?: { id?: StringComparators };  // Filter by cycle ID
}

export interface SearchIssuesArgs {
  query: string;
  includeRelationships?: boolean;
  filter?: IssueFieldFilters & {
    // Maintain backward compatibility
    assignedTo?: string;    // User ID or 'me' for self
    createdBy?: string;     // User ID or 'me' for self
    // Support logical operators
    and?: IssueFieldFilters[];
    or?: IssueFieldFilters[];
    // Cycle filter for easy access
    cycle?: CycleFilter;    // Filter by cycle (current, next, previous, or specific)
  };
  projectId?: string;       // Filter by project ID (backward compatibility)
  projectName?: string;     // Filter by project name (backward compatibility)
}
