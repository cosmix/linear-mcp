import { Comment, Issue } from '@linear/sdk';
import { LinearComment, LinearRelationship } from '../../types/linear/issue';

/**
 * Extracts issue and user mentions from text
 * @param text The text to extract mentions from
 * @returns Object containing arrays of issue and user mentions
 */
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

/**
 * Cleans description text by removing excessive whitespace and markdown artifacts
 * @param description The description to clean
 * @returns Cleaned description text
 */
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

/**
 * Gets comments for an issue
 * @param issue The issue to get comments for
 * @returns Array of formatted comments
 */
export const getComments = async (issue: Issue): Promise<LinearComment[]> => {
  const comments = await issue.comments();
  return Promise.all(
    comments.nodes.map(async (comment: Comment): Promise<LinearComment> => {
      const user = await comment.user;
      return {
        id: comment.id,
        body: comment.body,
        userId: user?.id ?? '',
        userName: user?.name,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt?.toISOString(),
      };
    })
  );
};

/**
 * Gets relationships for an issue
 * @param issue The issue to get relationships for
 * @returns Array of formatted relationships
 */
export const getRelationships = async (issue: Issue): Promise<LinearRelationship[]> => {
  const relationships: LinearRelationship[] = [];

  // Get parent
  const parent = await issue.parent;
  if (parent) {
    relationships.push({
      type: 'parent',
      issueId: parent.id,
      identifier: parent.identifier,
      title: parent.title,
    });
  }

  // Get sub-issues
  const children = await issue.children();
  for (const child of children.nodes) {
    relationships.push({
      type: 'sub',
      issueId: child.id,
      identifier: child.identifier,
      title: child.title,
    });
  }

  // Get other relationships
  const relations = await issue.relations();
  for (const relation of relations.nodes) {
    const relatedIssue = await relation.relatedIssue;
    if (relatedIssue) {
      relationships.push({
        type: relation.type.toLowerCase() as 'related' | 'blocked' | 'blocking' | 'duplicate',
        issueId: relatedIssue.id,
        identifier: relatedIssue.identifier,
        title: relatedIssue.title,
      });
    }
  }

  return relationships;
};
