import { StorageService } from './StorageService';

class ApiServiceClass {
  private baseUrl = 'https://your-backend-url.com'; // Replace with your actual backend URL
  
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const token = await StorageService.getToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });
      
      if (response.status === 401) {
        // Token expired, logout user
        await StorageService.removeToken();
        await StorageService.removeUser();
        throw new Error('Authentication expired');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
  
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }
  
  async post(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async put(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }
  
  async uploadFile(endpoint: string, file: any): Promise<any> {
    try {
      const token = await StorageService.getToken();
      
      const formData = new FormData();
      formData.append('file', file);
      
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`File upload failed for ${endpoint}:`, error);
      throw error;
    }
  }
}

export const ApiService = new ApiServiceClass();