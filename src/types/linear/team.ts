// Team-related argument interfaces
export interface GetTeamsArgs {
  nameFilter?: string; // Optional filter to search by team name
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
}
