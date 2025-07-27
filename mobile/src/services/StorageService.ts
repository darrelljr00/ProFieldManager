import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageServiceClass {
  // Authentication tokens
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // User data
  async getUser(): Promise<any | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async setUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user:', error);
    }
  }

  // App settings
  async getSetting(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`setting_${key}`);
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return null;
    }
  }

  async setSetting(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`setting_${key}`, value);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  }

  // Cache management
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Complete logout cleanup
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all storage:', error);
    }
  }
}

export const StorageService = new StorageServiceClass();