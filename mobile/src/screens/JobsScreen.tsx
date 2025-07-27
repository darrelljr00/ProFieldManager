import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Card, Button, Chip, SearchBar, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ApiService } from '../services/ApiService';

interface Job {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'scheduled' | 'cancelled';
  address: string;
  scheduledDate: string;
  customerName: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number;
}

export default function JobsScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => ApiService.get('/api/projects'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredJobs = jobs?.filter((job: Job) => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#16a34a';
      case 'completed': return '#2563eb';
      case 'scheduled': return '#ca8a04';
      case 'cancelled': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#64748b';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const JobCard = ({ job }: { job: Job }) => (
    <Card style={styles.jobCard} onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
      <Card.Content>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.name}</Text>
          <Chip
            mode="outlined"
            textStyle={{ color: getStatusColor(job.status), fontSize: 12 }}
            style={[styles.statusChip, { borderColor: getStatusColor(job.status) }]}
          >
            {job.status.toUpperCase()}
          </Chip>
        </View>

        <Text style={styles.customerName}>{job.customerName}</Text>
        <Text style={styles.jobDescription} numberOfLines={2}>{job.description}</Text>

        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>{job.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="clock" size={16} color="#64748b" />
            <Text style={styles.detailText}>{formatDate(job.scheduledDate)}</Text>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <Chip
            mode="outlined"
            icon="flag"
            textStyle={{ color: getPriorityColor(job.priority), fontSize: 12 }}
            style={[styles.priorityChip, { borderColor: getPriorityColor(job.priority) }]}
          >
            {job.priority.toUpperCase()}
          </Chip>
          <Text style={styles.duration}>{job.estimatedDuration}h estimated</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const FilterChips = () => (
    <View style={styles.filterContainer}>
      {['all', 'active', 'scheduled', 'completed', 'cancelled'].map((status) => (
        <Chip
          key={status}
          mode={filterStatus === status ? 'flat' : 'outlined'}
          selected={filterStatus === status}
          onPress={() => setFilterStatus(status)}
          style={styles.filterChip}
          textStyle={{ fontSize: 12 }}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Chip>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          placeholder="Search jobs..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
        <FilterChips />
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={({ item }) => <JobCard job={item} />}
        keyExtractor={(item) => item.id.toString()}
        style={styles.jobsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'No jobs available at the moment'
              }
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        label="New Job"
        style={styles.fab}
        onPress={() => {
          Alert.alert('New Job', 'Job creation is available in the web app');
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
  header: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 2,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: '#f1f5f9',
  },
  searchInput: {
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  jobsList: {
    flex: 1,
    padding: 16,
  },
  jobCard: {
    marginBottom: 12,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  statusChip: {
    height: 24,
  },
  customerName: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityChip: {
    height: 24,
  },
  duration: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563eb',
  },
});