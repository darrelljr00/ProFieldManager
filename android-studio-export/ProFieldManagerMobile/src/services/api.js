// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this URL to point to your Replit app
const API_BASE_URL = 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api';

class ApiService {
  async getAuthToken() {
    return await AsyncStorage.getItem('auth_token');
  }
  
  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
  
  // Auth methods
  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      await AsyncStorage.setItem('auth_token', response.token);
    }
    
    return response;
  }
  
  async logout() {
    await AsyncStorage.removeItem('auth_token');
    return this.request('/auth/logout', { method: 'POST' });
  }
  
  // HTTP methods
  get(endpoint) { 
    return this.request(endpoint); 
  }
  
  post(endpoint, data) { 
    return this.request(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }); 
  }
  
  put(endpoint, data) { 
    return this.request(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }); 
  }
  
  delete(endpoint) { 
    return this.request(endpoint, { 
      method: 'DELETE' 
    }); 
  }
  
  // Field service specific endpoints
  async getJobs() {
    return this.get('/jobs');
  }
  
  async updateJobStatus(jobId, status) {
    return this.put(`/jobs/${jobId}`, { status });
  }
  
  async getCustomers() {
    return this.get('/customers');
  }
  
  async createExpense(expenseData) {
    return this.post('/expenses', expenseData);
  }
  
  async uploadFile(formData) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }
    
    return response.json();
  }
}

export const apiService = new ApiService();