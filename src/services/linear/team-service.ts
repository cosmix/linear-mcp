import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { GetTeamsArgs, LinearTeam } from '../../types/linear/team';
import { LinearBaseService } from './base-service';

// Interface for cycle data
export interface LinearCycle {
  id: string;
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isCompleted: boolean;
  teamId: string;
}

export class TeamService extends LinearBaseService {
  /**
   * Gets a list of teams with optional name filtering
   * @param args The team filtering arguments
   * @returns A list of teams
   */
  async getTeams(args: GetTeamsArgs): Promise<LinearTeam[]> {
    try {
      const teams = await this.client.teams();
      let filteredTeams = teams.nodes.filter(team => team && team.id); // Only require id to be present
      
      // Apply name filter if provided
      if (args.nameFilter) {
        const filter = args.nameFilter.toLowerCase();
        filteredTeams = filteredTeams.filter(team => {
          const name = team.name || '';
          const key = team.key || '';
          return name.toLowerCase().includes(filter) || key.toLowerCase().includes(filter);
        });
      }

      return filteredTeams.map(team => ({
        id: team.id,
        name: team.name || '', // Default to empty string if undefined
        key: team.key || '', // Default to empty string if undefined
        description: team.description || undefined
      }));
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch teams: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetches cycles for a specific team
   * @param teamId The ID of the team to fetch cycles for
   * @returns Array of cycles with their details
   */
  async getTeamCycles(teamId: string): Promise<LinearCycle[]> {
    try {
      // Get the team
      const teams = await this.client.teams();
      const team = teams.nodes.find(t => t.id === teamId);
      
      if (!team) {
        throw new McpError(ErrorCode.InvalidRequest, `Team not found: ${teamId}`);
      }

      // Get the team's cycles
      const cycles = await team.cycles();
      
      return cycles.nodes.map(cycle => {
        // Determine if cycle is active based on dates and completion status
        const now = new Date();
        const startDate = cycle.startsAt ? new Date(cycle.startsAt) : null;
        const endDate = cycle.endsAt ? new Date(cycle.endsAt) : null;
        const isActive = startDate && endDate 
          ? now >= startDate && now <= endDate && !cycle.completedAt
          : false;
        
        return {
          id: cycle.id,
          number: cycle.number,
          name: cycle.name || '', // Default to empty string if undefined
          startsAt: cycle.startsAt?.toISOString() || '',
          endsAt: cycle.endsAt?.toISOString() || '',
          isActive,
          isCompleted: Boolean(cycle.completedAt),
          teamId: team.id
        };
      });
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch team cycles: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
