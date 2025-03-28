
// Common comparator types used across filtering operations
export interface StringComparators {
  eq?: string;
  neq?: string;
  in?: string[];
  nin?: string[];
  eqIgnoreCase?: string;
  neqIgnoreCase?: string;
  startsWith?: string;
  notStartsWith?: string;
  endsWith?: string;
  notEndsWith?: string;
  contains?: string;
  notContains?: string;
  containsIgnoreCase?: string;
  notContainsIgnoreCase?: string;
  null?: boolean;
}

export interface NumberComparators {
  eq?: number;
  neq?: number;
  in?: number[];
  nin?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  null?: boolean;
}

export interface DateComparators {
  eq?: string;
  neq?: string;
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  null?: boolean;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

// Helper functions for data cleaning
export const extractMentions = (text: string | null | undefined): { issues: string[]; users: string[] } => {
  if (!text) return { issues: [], users: [] };

  // Linear uses identifiers like ABC-123
  const issues = Array.from(text.matchAll(/([A-Z]+-\d+)/g)).map(m => m[1]);
  // Linear uses @ mentions
  const users = Array.from(text.matchAll(/@([a-zA-Z0-9_-]+)/g)).map(m => m[1]);

  return {
    issues: [...new Set(issues)], // Deduplicate
    users: [...new Set(users)]    // Deduplicate
  };
};

export const cleanDescription = (description: string | null | undefined): string | null => {
  if (!description) return null;

  // Remove excessive whitespace
  let cleaned = description.replace(/\s+/g, ' ').trim();

  // Remove common markdown artifacts while preserving content
  cleaned = cleaned
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to just text
    .replace(/#{1,6}\s.*?(?:\n|(?=\*\*|__|_|\[|`))/g, '') // Remove headings until newline or next markdown element
    .replace(/(\*\*|__)(.*?)\1/g, '$2')      // Remove bold markers but keep content
    .replace(/(\*|_)(.*?)\1/g, '$2')         // Remove italic markers but keep content
    .replace(/`([^`]+)`/g, '$1')             // Remove inline code markers but keep content

  return cleaned;
};
