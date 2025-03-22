import { describe, test, expect, beforeEach, mock, spyOn } from 'bun:test';
import { LinearAPIService } from '../linear/index.js';
import { createMockLinearClient } from './test-utils';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { CycleService } from '../linear/cycle-service';
import { IssueService } from '../linear/issue-service';

describe('LinearAPIService - Cycle Assignment', () => {
  let service: LinearAPIService;
  let mockClient: any;
  let mockIssueService: any;
  let mockUpdateIssue: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    
    // Create a mock for the updateIssue method
    mockUpdateIssue = mock();
    
    // Create a mock IssueService
    mockIssueService = {
      updateIssue: mockUpdateIssue,
      getIssue: mock(() => Promise.resolve({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        status: 'In Progress',
        priority: 1,
        teamName: 'Engineering'
      }))
    };
    
    // Create the service with the mock client
    service = new LinearAPIService(mockClient);
    
    // Replace the IssueService with our mock
    (service as any).issueService = mockIssueService;
  });

  describe('updateIssue with cycle assignment', () => {
    test('assigns issue to a cycle using UUID directly', async () => {
      // Set up the mock to return a successful result
      mockUpdateIssue.mockImplementation(async () => ({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        status: 'In Progress',
        priority: 1,
        teamName: 'Engineering',
        cycleId: 'cycle-uuid-123'
      }));

      // Test updating issue with direct UUID
      await service.updateIssue({
        issueId: 'TEST-123',
        cycleId: 'cycle-uuid-123'
      });

      // Verify the correct update was applied
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        issueId: 'TEST-123',
        cycleId: 'cycle-uuid-123'
      });
    });

    test('resolves and assigns issue to current cycle', async () => {
      // Set up the mock to return a successful result
      mockUpdateIssue.mockImplementation(async () => ({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        status: 'In Progress',
        priority: 1,
        teamName: 'Engineering',
        cycleId: 'current'
      }));

      // Test updating issue with 'current' cycle
      await service.updateIssue({
        issueId: 'TEST-123',
        cycleId: 'current'
      });

      // Verify the correct update was applied
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        issueId: 'TEST-123',
        cycleId: 'current'
      });
    });

    test('resolves and assigns issue to next cycle', async () => {
      // Set up the mock to return a successful result
      mockUpdateIssue.mockImplementation(async () => ({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        status: 'In Progress',
        priority: 1,
        teamName: 'Engineering',
        cycleId: 'next'
      }));

      // Test updating issue with 'next' cycle
      await service.updateIssue({
        issueId: 'TEST-123',
        cycleId: 'next'
      });

      // Verify the correct update was applied
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        issueId: 'TEST-123',
        cycleId: 'next'
      });
    });

    test('resolves and assigns issue to previous cycle', async () => {
      // Set up the mock to return a successful result
      mockUpdateIssue.mockImplementation(async () => ({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        status: 'In Progress',
        priority: 1,
        teamName: 'Engineering',
        cycleId: 'previous'
      }));

      // Test updating issue with 'previous' cycle
      await service.updateIssue({
        issueId: 'TEST-123',
        cycleId: 'previous'
      });

      // Verify the correct update was applied
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        issueId: 'TEST-123',
        cycleId: 'previous'
      });
    });

    test('resolves and assigns issue to specific cycle by number', async () => {
      // Set up the mock to return a successful result
      mockUpdateIssue.mockImplementation(async () => ({
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        status: 'In Progress',
        priority: 1,
        teamName: 'Engineering',
        cycleId: '2'
      }));

      // Test updating issue with cycle number '2'
      await service.updateIssue({
        issueId: 'TEST-123',
        cycleId: '2'
      });

      // Verify the correct update was applied
      expect(mockUpdateIssue).toHaveBeenCalledWith({
        issueId: 'TEST-123',
        cycleId: '2'
      });
    });

    test('handles error when no cycles found', async () => {
      // Set up the mock to throw an error
      mockUpdateIssue.mockImplementation(() => {
        throw new McpError(
          -32600,
          'No cycles found for team team-123'
        );
      });

      // Test with team that has no cycles
      await expect(service.updateIssue({
        issueId: 'TEST-123',
        cycleId: 'current'
      })).rejects.toThrow(/No cycles found for team team-123/);
    });

    test('handles error when cycle number not found', async () => {
      // Set up the mock to throw an error
      mockUpdateIssue.mockImplementation(() => {
        throw new McpError(
          -32600,
          'No cycle found with number 999 for team team-123'
        );
      });

      // Test with non-existent cycle number
      await expect(service.updateIssue({
        issueId: 'TEST-123',
        cycleId: '999'
      })).rejects.toThrow(/No cycle found with number 999 for team team-123/);
    });
  });
});
