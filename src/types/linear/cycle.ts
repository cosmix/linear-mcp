// Cycle filter for querying issues by cycle
export interface CycleFilter {
  type: 'current' | 'next' | 'previous' | 'specific';
  id?: string;      // Required when type is 'specific', ignored for other types
  teamId: string;   // Required to identify which team's cycles to use
}

// Type guard for CycleFilter
export const isCycleFilter = (filter: unknown): filter is CycleFilter =>
  typeof filter === 'object' &&
  filter !== null &&
  ['current', 'next', 'previous', 'specific'].includes((filter as CycleFilter).type) &&
  typeof (filter as CycleFilter).teamId === 'string' &&
  // For 'specific' type, id is required and must be a string
  ((filter as CycleFilter).type !== 'specific' ||
    (typeof (filter as CycleFilter).id === 'string' && (filter as CycleFilter).id !== undefined));
