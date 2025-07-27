import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from './ApiService';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: number;
  permissions: Record<string, boolean>;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

class AuthServiceClass {
  private baseUrl = 'https://your-backend-url.com'; // Replace with your actual backend URL
  
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return data;
      }
      
      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }
  
  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  }
  
  async getUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
  
  async refreshUser(): Promise<User | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;
      
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  }
}

export const AuthService = new AuthServiceClass();