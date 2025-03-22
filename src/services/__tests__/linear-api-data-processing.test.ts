import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearAPIService } from '../linear/index.js';
import { createMockLinearClient } from './test-utils';

describe('LinearAPIService - Data Processing', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('data cleaning', () => {
    test('extracts multiple issue mentions from text', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Related to TEST-2 and TEST-3. CC @john and @jane',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.issue.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.mentionedIssues).toEqual(['TEST-2', 'TEST-3']);
      expect(result.mentionedUsers).toEqual(['john', 'jane']);
    });

    test('extracts mentions from comments when relationships included', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: 'Initial description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
        comments: () => Promise.resolve({
          nodes: [
            {
              id: 'comment-1',
              body: 'Related to TEST-4. CC @alice',
              createdAt: new Date('2025-01-24'),
              updatedAt: new Date('2025-01-24'),
              user: Promise.resolve({ id: 'user-1', name: 'John Doe' })
            },
            {
              id: 'comment-2',
              body: 'Blocked by TEST-5. CC @bob',
              createdAt: new Date('2025-01-24'),
              updatedAt: new Date('2025-01-24'),
              user: Promise.resolve({ id: 'user-2', name: 'Jane Smith' })
            }
          ]
        })
      };

      mockClient.issue.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1', includeRelationships: true });

      expect(result.mentionedIssues).toEqual(['TEST-4', 'TEST-5']);
      expect(result.mentionedUsers).toEqual(['alice', 'bob']);
    });

    test('cleans various markdown elements from description', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: '# Heading\n**Bold** and _italic_ text with `code`\n[Link](https://example.com)',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.issue.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.description).toBe('Bold and italic text with code Link');
    });

    test('handles complex markdown formatting', async () => {
      const testIssue = {
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        description: '# Main Heading\n## Sub Heading\n- List item 1\n- List item 2\n\n> Quote here\n\n```\ncode block\n```\n\n---\n\nFinal paragraph',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(undefined),
        children: () => Promise.resolve({ nodes: [] }),
        relations: () => Promise.resolve({ nodes: [] }),
      };

      mockClient.issue.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-1' });

      expect(result.description).toBe('`` code block `` --- Final paragraph');
    });
  });

  describe('relationship tracking', () => {
    test('tracks all relationship types', async () => {
      const mockParent = {
        id: 'parent-1',
        identifier: 'TEST-1',
        title: 'Parent Issue'
      };

      const mockChild = {
        id: 'child-1',
        identifier: 'TEST-3',
        title: 'Child Issue'
      };

      const mockRelated = {
        id: 'related-1',
        identifier: 'TEST-4',
        title: 'Related Issue'
      };

      const mockBlocked = {
        id: 'blocked-1',
        identifier: 'TEST-5',
        title: 'Blocked Issue'
      };

      const testIssue = {
        id: 'issue-2',
        identifier: 'TEST-2',
        title: 'Test Issue',
        description: 'Test Description',
        priority: 1,
        createdAt: new Date('2025-01-24'),
        updatedAt: new Date('2025-01-24'),
        state: Promise.resolve({ name: 'In Progress' }),
        assignee: Promise.resolve({ name: 'John Doe' }),
        team: Promise.resolve({ name: 'Engineering' }),
        creator: Promise.resolve({ name: 'Jane Smith' }),
        labels: () => Promise.resolve({ nodes: [] }),
        parent: Promise.resolve(mockParent),
        children: () => Promise.resolve({ nodes: [mockChild] }),
        relations: () => Promise.resolve({
          nodes: [
            {
              type: 'related',
              relatedIssue: Promise.resolve(mockRelated)
            },
            {
              type: 'blocked',
              relatedIssue: Promise.resolve(mockBlocked)
            }
          ]
        })
      };

      mockClient.issue.mockImplementation(async () => testIssue);

      const result = await service.getIssue({ issueId: 'TEST-2' });

      expect(result.relationships).toEqual([
        {
          type: 'parent',
          issueId: 'parent-1',
          identifier: 'TEST-1',
          title: 'Parent Issue'
        },
        {
          type: 'sub',
          issueId: 'child-1',
          identifier: 'TEST-3',
          title: 'Child Issue'
        },
        {
          type: 'related',
          issueId: 'related-1',
          identifier: 'TEST-4',
          title: 'Related Issue'
        },
        {
          type: 'blocked',
          issueId: 'blocked-1',
          identifier: 'TEST-5',
          title: 'Blocked Issue'
        }
      ]);
    });
  });
});
