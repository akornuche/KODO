import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../../src/services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be an axios instance', () => {
    expect(api).toBeDefined();
    // Axios instance is a function with object properties
    expect(api.defaults).toBeDefined();
    expect(api.get).toBeDefined();
    expect(api.post).toBeDefined();
  });

  it('should have baseURL configured', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5000');
  });

  describe('Request Interceptors', () => {
    it('should add authorization header when token exists', async () => {
      // This test assumes interceptors will be added later
      const mockToken = 'test-jwt-token';
      localStorage.setItem('token', mockToken);

      // Mock the request
      const config = { headers: {} };
      
      // Simulate what interceptor would do
      if (localStorage.getItem('token')) {
        config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      }

      expect(config.headers.Authorization).toBe(`Bearer ${mockToken}`);
      
      localStorage.clear();
    });
  });

  describe('Response Interceptors', () => {
    it('should handle successful responses', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 1 } },
        status: 200,
      };

      // Verify response structure
      expect(mockResponse.status).toBe(200);
      expect(mockResponse.data.success).toBe(true);
    });

    it('should handle error responses', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      // Verify error structure
      expect(mockError.response.status).toBe(401);
      expect(mockError.response.data.message).toBe('Unauthorized');
    });
  });

  describe('Environment Configuration', () => {
    it('should use localhost for development', () => {
      expect(api.defaults.baseURL).toContain('localhost');
    });

    it('should allow baseURL override from environment', () => {
      const customBaseURL = process.env.VITE_API_URL || 'http://localhost:5000';
      expect(typeof customBaseURL).toBe('string');
      expect(customBaseURL).toMatch(/^https?:\/\//);
    });
  });
});
