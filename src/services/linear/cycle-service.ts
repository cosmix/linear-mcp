import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { CycleFilter } from '../../types/linear/cycle';
import { LinearBaseService, LinearClientInterface } from './base-service';
import { LinearCycle, TeamService } from './team-service';

export class CycleService extends LinearBaseService {
  private teamService: TeamService;

  constructor(clientOrApiKey: string | LinearClientInterface) {
    super(clientOrApiKey);
    this.teamService = new TeamService(this.client);
  }

  /**
   * Resolves a cycle filter to a specific cycle ID
   * @param filter The cycle filter to resolve
   * @returns The resolved cycle ID
   */
  async resolveCycleFilter(filter: CycleFilter): Promise<string> {
    const { type, id, teamId } = filter;
    
    // For specific type with UUID-style ID, just return the ID
    if (type === 'specific' && id && !(/^\d+$/.test(id))) {
      return id;
    }
    
    // For all other cases, including specific type with numeric ID, we need teamId
    if (!teamId) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `teamId is required for cycle type: ${type}`
      );
    }
    
    // Fetch team cycles
    const cycles = await this.teamService.getTeamCycles(teamId);
    
    // For specific type with numeric ID (cycle number), find the matching cycle
    if (type === 'specific' && id && /^\d+$/.test(id)) {
      const cycleNumber = parseInt(id, 10);
      const matchingCycle = cycles.find(c => c.number === cycleNumber);
      
      if (!matchingCycle) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `No cycle found with number ${cycleNumber} for team ${teamId}`
        );
      }
      
      return matchingCycle.id;
    }
    
    if (cycles.length === 0) {
      throw new McpError(ErrorCode.InvalidRequest, `No cycles found for team ${teamId}`);
    }
    
    // Sort cycles by start date (newest first)
    const sortedCycles = [...cycles].sort((a, b) => 
      new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
    );
    
    // Find the active cycle
    const activeCycle = sortedCycles.find(c => c.isActive);
    
    // Find completed cycles
    const completedCycles = sortedCycles.filter(c => c.isCompleted)
      .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());
    
    // Find upcoming cycles (not active and not completed)
    const upcomingCycles = sortedCycles.filter(c => !c.isActive && !c.isCompleted)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    
    switch (type) {
      case 'current':
        if (!activeCycle) {
          throw new McpError(ErrorCode.InvalidRequest, `No active cycle found for team ${teamId}`);
        }
        return activeCycle.id;
        
      case 'next':
        if (upcomingCycles.length === 0) {
          throw new McpError(ErrorCode.InvalidRequest, `No upcoming cycles found for team ${teamId}`);
        }
        return upcomingCycles[0].id;
        
      case 'previous':
        if (completedCycles.length === 0) {
          throw new McpError(ErrorCode.InvalidRequest, `No completed cycles found for team ${teamId}`);
        }
        // Get the most recently completed cycle
        return completedCycles[0].id;
        
      default:
        throw new McpError(ErrorCode.InvalidRequest, `Invalid cycle type: ${type}`);
    }
  }
}
