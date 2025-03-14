import { describe, test, expect, beforeEach } from 'bun:test';
import { LinearAPIService } from '../linear-api';
import { createMockLinearClient } from './test-utils';

describe('LinearAPIService - Core', () => {
  let service: LinearAPIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new LinearAPIService(mockClient);
  });

  describe('constructor', () => {
    test('throws error when API key is missing', () => {
      expect(() => new LinearAPIService('')).toThrow('LINEAR_API_KEY is required');
    });

    test('creates instance with valid API key', () => {
      const serviceWithKey = new LinearAPIService('test-api-key');
      expect(serviceWithKey).toBeInstanceOf(LinearAPIService);
      expect(serviceWithKey).toBeDefined();
    });

    test('creates instance with client interface', () => {
      expect(service).toBeInstanceOf(LinearAPIService);
      expect(service).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    test('returns current user information', async () => {
      const result = await (service as any).getCurrentUser();
      expect(result).toEqual({
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com'
      });
    });
  });
});
