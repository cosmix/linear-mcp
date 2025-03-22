import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearAPIService } from '../linear/index.js';
import { createMockLinearClient } from './test-utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('LinearAPIService - Team Management', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('getTeams', () => {
    test('handles empty teams list', async () => {
      mockClient.teams.mockImplementation(async () => ({ nodes: [] }));
      const result = await service.getTeams({});
      expect(result).toEqual([]);
    });

    test('returns all teams when no filter provided', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null }
        ]
      };

      mockClient.teams.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});

      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
        { id: 'team-2', name: 'Design', key: 'DES', description: undefined }
      ]);
    });

    test('performs case-insensitive name filtering', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null },
          { id: 'team-3', name: 'QA TEAM', key: 'QA', description: 'Quality Assurance' }
        ]
      };

      mockClient.teams.mockImplementation(async () => mockTeams);

      // Test lowercase filter
      let result = await service.getTeams({ nameFilter: 'engineering' });
      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' }
      ]);

      // Test uppercase filter
      result = await service.getTeams({ nameFilter: 'DESIGN' });
      expect(result).toEqual([
        { id: 'team-2', name: 'Design', key: 'DES', description: undefined }
      ]);

      // Test mixed case filter
      result = await service.getTeams({ nameFilter: 'Qa' });
      expect(result).toEqual([
        { id: 'team-3', name: 'QA TEAM', key: 'QA', description: 'Quality Assurance' }
      ]);
    });

    test('filters teams by name', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null }
        ]
      };

      mockClient.teams.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({ nameFilter: 'eng' });

      expect(result).toEqual([
        { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' }
      ]);
    });

    test('filters teams by key', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: 'Engineering', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: 'DES', description: null }
        ]
      };

      mockClient.teams.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({ nameFilter: 'des' });

      expect(result).toEqual([
        { id: 'team-2', name: 'Design', key: 'DES', description: undefined }
      ]);
    });

    test('handles missing or invalid team fields', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: '', key: 'ENG', description: 'Engineering team' },
          { id: 'team-2', name: 'Design', key: '', description: null },
          { id: 'team-3', name: '', key: '', description: undefined }
        ]
      };

      mockClient.teams.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});
      expect(result).toEqual([
        { id: 'team-1', name: '', key: 'ENG', description: 'Engineering team' },
        { id: 'team-2', name: 'Design', key: '', description: undefined },
        { id: 'team-3', name: '', key: '', description: undefined }
      ]);
    });

    test('handles malformed team data', async () => {
      const mockTeams = {
        nodes: [
          { id: 'team-1', name: '', key: '' }, // Empty required fields
          { id: 'team-2', name: 'Design', key: '' }, // Missing key
          { id: 'team-3', name: '', key: 'QA' }, // Missing name
          null, // Null team
          undefined, // Undefined team
          {} // Empty team
        ]
      };

      mockClient.teams.mockImplementation(async () => mockTeams);

      const result = await service.getTeams({});
      expect(result).toEqual([
        { id: 'team-1', name: '', key: '', description: undefined },
        { id: 'team-2', name: 'Design', key: '', description: undefined },
        { id: 'team-3', name: '', key: 'QA', description: undefined }
      ]);
    });

    test('handles API errors', async () => {
      mockClient.teams.mockImplementation(async () => {
        throw new Error('API error');
      });

      await expect(service.getTeams({})).rejects.toThrow(
        new McpError(ErrorCode.InternalError, 'Failed to fetch teams: API error')
      );
    });
  });
});
