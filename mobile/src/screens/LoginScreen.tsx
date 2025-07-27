import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Button, TextInput, Card, ActivityIndicator } from 'react-native-paper';
import { AuthService } from '../services/AuthService';
import { StorageService } from '../services/StorageService';

interface LoginScreenProps {
  navigation: any;
  route: {
    params: {
      onAuthenticated?: () => void;
    };
  };
}

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await AuthService.login(username.trim(), password);
      
      if (result.success) {
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => {
              if (route.params?.onAuthenticated) {
                route.params.onAuthenticated();
              }
            },
          },
        ]);
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>PFM</Text>
          </View>
          <Text style={styles.appTitle}>Pro Field Manager</Text>
          <Text style={styles.appSubtitle}>Professional Field Service Management</Text>
        </View>

        <Card style={styles.loginCard}>
          <Card.Content style={styles.cardContent}>
            <Text style={styles.loginTitle}>Welcome Back</Text>
            <Text style={styles.loginSubtitle}>Sign in to your account</Text>

            <TextInput
              label="Username or Email"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              left={<TextInput.Icon icon="lock" />}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                'Sign In'
              )}
            </Button>

            <View style={styles.helpContainer}>
              <Button
                mode="text"
                onPress={() => Alert.alert('Help', 'Contact your administrator for password reset')}
                compact
              >
                Forgot Password?
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pro Field Manager Mobile v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            Secure field service management
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  loginCard: {
    elevation: 4,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  loginButtonContent: {
    height: 48,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
});