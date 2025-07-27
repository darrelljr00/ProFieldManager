import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ApiService } from '../services/ApiService';
import { AuthService } from '../services/AuthService';

interface TimeEntry {
  id: number;
  clockInTime: string;
  clockOutTime?: string;
  totalHours?: number;
  location?: string;
  status: 'active' | 'completed';
}

export default function TimeClockScreen({ navigation }: any) {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadCurrentEntry();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadUser = async () => {
    const currentUser = await AuthService.getUser();
    setUser(currentUser);
  };

  const loadCurrentEntry = async () => {
    try {
      const response = await ApiService.get('/api/time-clock/current');
      setCurrentEntry(response.entry);
    } catch (error) {
      console.error('Failed to load current time entry:', error);
    }
  };

  const clockIn = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.post('/api/time-clock/clock-in', {
        timestamp: new Date().toISOString(),
      });

      setCurrentEntry(response.entry);
      Alert.alert('Success', 'Clocked in successfully!');
    } catch (error) {
      console.error('Clock in error:', error);
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clockOut = async () => {
    if (!currentEntry) return;

    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await ApiService.post('/api/time-clock/clock-out', {
                entryId: currentEntry.id,
                timestamp: new Date().toISOString(),
              });

              setCurrentEntry(null);
              Alert.alert(
                'Success',
                `Clocked out successfully! Total time: ${response.totalHours.toFixed(2)} hours`
              );
            } catch (error) {
              console.error('Clock out error:', error);
              Alert.alert('Error', 'Failed to clock out. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateElapsedTime = () => {
    if (!currentEntry?.clockInTime) return '00:00:00';

    const clockInTime = new Date(currentEntry.clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - clockInTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isClockedIn = currentEntry && currentEntry.status === 'active';

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <Icon name="clock" size={32} color="#2563eb" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Time Clock</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.timeCard}>
        <Card.Content style={styles.timeContent}>
          <Text style={styles.currentDate}>{formatDate(currentTime)}</Text>
          <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
          
          {isClockedIn && (
            <View style={styles.elapsedTime}>
              <Text style={styles.elapsedLabel}>Time Worked Today:</Text>
              <Text style={styles.elapsedValue}>{calculateElapsedTime()}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {currentEntry && (
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon 
                name={isClockedIn ? 'clock-in' : 'clock-out'} 
                size={24} 
                color={isClockedIn ? '#16a34a' : '#64748b'} 
              />
              <Text style={styles.statusTitle}>
                {isClockedIn ? 'Currently Clocked In' : 'Last Session'}
              </Text>
            </View>
            
            <View style={styles.entryDetails}>
              <View style={styles.entryRow}>
                <Text style={styles.entryLabel}>Clock In:</Text>
                <Text style={styles.entryValue}>
                  {new Date(currentEntry.clockInTime).toLocaleTimeString()}
                </Text>
              </View>
              
              {currentEntry.clockOutTime && (
                <>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Clock Out:</Text>
                    <Text style={styles.entryValue}>
                      {new Date(currentEntry.clockOutTime).toLocaleTimeString()}
                    </Text>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Total Hours:</Text>
                    <Text style={styles.entryValue}>
                      {currentEntry.totalHours?.toFixed(2)} hours
                    </Text>
                  </View>
                </>
              )}
              
              {currentEntry.location && (
                <View style={styles.entryRow}>
                  <Text style={styles.entryLabel}>Location:</Text>
                  <Text style={styles.entryValue}>{currentEntry.location}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actionContainer}>
        {isClockedIn ? (
          <Button
            mode="contained"
            onPress={clockOut}
            style={[styles.actionButton, styles.clockOutButton]}
            contentStyle={styles.actionButtonContent}
            loading={isLoading}
            disabled={isLoading}
            icon="clock-out"
          >
            Clock Out
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={clockIn}
            style={[styles.actionButton, styles.clockInButton]}
            contentStyle={styles.actionButtonContent}
            loading={isLoading}
            disabled={isLoading}
            icon="clock-in"
          >
            Clock In
          </Button>
        )}
      </View>

      <View style={styles.quickActions}>
        <Button
          mode="outlined"
          icon="history"
          onPress={() => navigation.navigate('TimeHistory')}
          style={styles.quickActionButton}
        >
          View History
        </Button>
        <Button
          mode="outlined"
          icon="chart-line"
          onPress={() => navigation.navigate('TimeReports')}
          style={styles.quickActionButton}
        >
          Reports
        </Button>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content style={styles.infoContent}>
          <Icon name="information" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            Your time entries are automatically tracked and will appear in your timesheet.
            GPS location may be recorded for verification purposes.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userName: {
    fontSize: 16,
    color: '#64748b',
  },
  timeCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#2563eb',
  },
  timeContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  currentDate: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'monospace',
  },
  elapsedTime: {
    marginTop: 16,
    alignItems: 'center',
  },
  elapsedLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  elapsedValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    fontFamily: 'monospace',
  },
  statusCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  entryDetails: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  entryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionContainer: {
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 8,
  },
  actionButtonContent: {
    height: 56,
  },
  clockInButton: {
    backgroundColor: '#16a34a',
  },
  clockOutButton: {
    backgroundColor: '#dc2626',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 0.48,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});