import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Card, Button, ActivityIndicator, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../services/ApiService';
import { AuthService } from '../services/AuthService';

const { width } = Dimensions.get('window');

interface DashboardStats {
  activeJobs: number;
  completedJobs: number;
  pendingTasks: number;
  totalRevenue: number;
  customerCount: number;
  teamMembers: number;
}

interface RecentActivity {
  id: number;
  type: 'job' | 'task' | 'customer' | 'invoice';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export default function DashboardScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await AuthService.getUser();
    setUser(currentUser);
  };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => ApiService.get('/api/dashboard/stats'),
  });

  const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ['/api/dashboard/activity'],
    queryFn: () => ApiService.get('/api/dashboard/activity'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchActivity()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const StatCard = ({ icon, title, value, color = '#2563eb' }: any) => (
    <Card style={[styles.statCard, { borderLeftColor: color }]}>
      <Card.Content style={styles.statContent}>
        <View style={styles.statHeader}>
          <Icon name={icon} size={24} color={color} />
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </Card.Content>
    </Card>
  );

  const ActivityItem = ({ item }: { item: RecentActivity }) => (
    <Card style={styles.activityCard}>
      <Card.Content style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Icon
            name={getActivityIcon(item.type)}
            size={20}
            color={getActivityColor(item.type)}
          />
          <Text style={styles.activityTitle}>{item.title}</Text>
        </View>
        <Text style={styles.activityDescription}>{item.description}</Text>
        <Text style={styles.activityTime}>{formatTime(item.timestamp)}</Text>
      </Card.Content>
    </Card>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job': return 'briefcase';
      case 'task': return 'check-circle';
      case 'customer': return 'account';
      case 'invoice': return 'receipt';
      default: return 'information';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'job': return '#2563eb';
      case 'task': return '#16a34a';
      case 'customer': return '#dc2626';
      case 'invoice': return '#ca8a04';
      default: return '#64748b';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (statsLoading && activityLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.firstName || 'User'}!
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="briefcase"
              title="Active Jobs"
              value={stats?.activeJobs || 0}
              color="#2563eb"
            />
            <StatCard
              icon="check-circle"
              title="Completed"
              value={stats?.completedJobs || 0}
              color="#16a34a"
            />
            <StatCard
              icon="clock"
              title="Pending Tasks"
              value={stats?.pendingTasks || 0}
              color="#dc2626"
            />
            <StatCard
              icon="currency-usd"
              title="Revenue"
              value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
              color="#ca8a04"
            />
          </View>
        </View>

        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activityLoading ? (
            <ActivityIndicator style={styles.activityLoader} />
          ) : recentActivity && recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map((item: RecentActivity) => (
              <ActivityItem key={item.id} item={item} />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Icon name="information-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyText}>No recent activity</Text>
              </Card.Content>
            </Card>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <Button
              mode="contained"
              icon="camera"
              onPress={() => navigation.navigate('Camera')}
              style={styles.actionButton}
            >
              Take Photo
            </Button>
            <Button
              mode="contained"
              icon="map-marker"
              onPress={() => navigation.navigate('GPS')}
              style={styles.actionButton}
            >
              GPS Tracking
            </Button>
            <Button
              mode="contained"
              icon="clock-check"
              onPress={() => navigation.navigate('Time Clock')}
              style={styles.actionButton}
            >
              Clock In/Out
            </Button>
            <Button
              mode="contained"
              icon="clipboard-check"
              onPress={() => navigation.navigate('Inspections')}
              style={styles.actionButton}
            >
              Inspection
            </Button>
          </View>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          Alert.alert(
            'Quick Actions',
            'What would you like to do?',
            [
              { text: 'Take Photo', onPress: () => navigation.navigate('Camera') },
              { text: 'Start GPS', onPress: () => navigation.navigate('GPS') },
              { text: 'View Jobs', onPress: () => navigation.navigate('Jobs') },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statContent: {
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  activityContainer: {
    padding: 20,
    paddingTop: 0,
  },
  activityCard: {
    marginBottom: 12,
    elevation: 1,
  },
  activityContent: {
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  activityLoader: {
    padding: 20,
  },
  emptyCard: {
    elevation: 1,
  },
  emptyContent: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
  quickActions: {
    padding: 20,
    paddingTop: 0,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 60) / 2,
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563eb',
  },
});