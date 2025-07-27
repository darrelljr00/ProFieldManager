import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import JobsScreen from './src/screens/JobsScreen';
import CameraScreen from './src/screens/CameraScreen';
import InspectionsScreen from './src/screens/InspectionsScreen';
import GPSTrackingScreen from './src/screens/GPSTrackingScreen';
import TimeClockScreen from './src/screens/TimeClockScreen';
import LoadingScreen from './src/screens/LoadingScreen';

// Import services
import { AuthService } from './src/services/AuthService';
import { StorageService } from './src/services/StorageService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom theme for Professional Field Management
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2563eb',
    accent: '#3b82f6',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    disabled: '#94a3b8',
  },
};

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Bottom Tab Navigator for authenticated users
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Jobs':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Camera':
              iconName = focused ? 'camera' : 'camera-outline';
              break;
            case 'Inspections':
              iconName = focused ? 'clipboard-check' : 'clipboard-check-outline';
              break;
            case 'GPS':
              iconName = focused ? 'map-marker' : 'map-marker-outline';
              break;
            case 'Time Clock':
              iconName = focused ? 'clock' : 'clock-outline';
              break;
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.disabled,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: '#e2e8f0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Inspections" component={InspectionsScreen} />
      <Tab.Screen name="GPS" component={GPSTrackingScreen} />
      <Tab.Screen name="Time Clock" component={TimeClockScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await StorageService.getToken();
      if (token) {
        const isValid = await AuthService.validateToken(token);
        setIsAuthenticated(isValid);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <View style={styles.container}>
          <StatusBar style="auto" />
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
              }}
            >
              {isAuthenticated ? (
                <Stack.Screen name="Main" component={MainTabNavigator} />
              ) : (
                <Stack.Screen name="Login">
                  {(props) => (
                    <LoginScreen 
                      {...props} 
                      route={{ 
                        ...props.route, 
                        params: { 
                          onAuthenticated: () => setIsAuthenticated(true) 
                        } 
                      }} 
                    />
                  )}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});