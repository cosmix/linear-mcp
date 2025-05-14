import { LinearClient } from '@linear/sdk';
import { LinearUser } from '../../types/linear/base';

export interface LinearClientInterface extends Pick<LinearClient, 
  'issue' | 'issues' | 'createIssue' | 
  'teams' | 'viewer' | 'deleteIssue' | 
  'project' | 'projects' | 
  'document' | 'documents' | 'createDocument' | 'documentUpdate' | 'deleteDocument'
> {}

export abstract class LinearBaseService {
  protected client: LinearClientInterface;

  constructor(clientOrApiKey: string | LinearClientInterface) {
    if (typeof clientOrApiKey === 'string') {
      if (!clientOrApiKey) {
        throw new Error('LINEAR_API_KEY is required');
      }
      this.client = new LinearClient({ apiKey: clientOrApiKey });
    } else {
      this.client = clientOrApiKey;
    }
  }

  /**
   * Gets the current authenticated user
   * @returns The current user information
   */
  protected async getCurrentUser(): Promise<LinearUser> {
    const viewer = await this.client.viewer;
    return {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email
    };
  }
}