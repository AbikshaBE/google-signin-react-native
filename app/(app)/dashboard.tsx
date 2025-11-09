import { useAppDispatch, useAppSelector } from '@/src/hooks';
import { signOut } from '@/src/store/authSlice';
import { fetchTasks, setFilters } from '@/src/store/tasksSlice';
import type { Task } from '@/src/types';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

const sortOptions = [
  { id: 'assignedDate', label: 'Assigned date' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'updatedAt', label: 'Updated' },
] as const;

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
] as const;

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.auth.profile);
  const tasksState = useAppSelector((state) => state.tasks);
  const network = useAppSelector((state) => state.network);

  const { filters } = tasksState;
  const [search, setSearch] = useState(filters.search);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTasks());
    }, [dispatch])
  );

  const tasks = useMemo(() => {
    const items = tasksState.ids.map((id) => tasksState.entities[id]).filter(Boolean) as Task[];
    const filtered = items.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filters.status === 'all' ? true : task.status === filters.status;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;
      const left = new Date(a[filters.sortBy] ?? a.updatedAt).getTime();
      const right = new Date(b[filters.sortBy] ?? b.updatedAt).getTime();
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });

    return sorted;
  }, [tasksState.ids, tasksState.entities, filters, search]);

  const onRefresh = () => {
    dispatch(fetchTasks());
  };

  const toggleSortDirection = () => {
    dispatch(
      setFilters({
        sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
      })
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    const dueSoon = item.dueDate ? new Date(item.dueDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 : false;
    return (
      <Link href={`/(app)/task/${item.id}`} asChild>
        <Pressable style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={[styles.badge, statusBadgeColor(item.status)]}>
              <Text style={styles.badgeText}>{formatStatus(item.status)}</Text>
            </View>
          </View>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.metaLabel}>Assigned</Text>
              <Text style={styles.metaValue}>{formatDate(item.assignedDate)}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Due</Text>
              <Text style={[styles.metaValue, dueSoon && styles.metaValueWarning]}>
                {item.dueDate ? formatDate(item.dueDate) : '—'}
              </Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Assignee</Text>
              <Text style={styles.metaValue}>{item.assignedTo}</Text>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi {profile?.fullName ?? profile?.email}</Text>
          <Text style={styles.subGreeting}>
            {network.isConnected ? 'All systems go.' : 'Offline mode — sync when back online.'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Link href="/(app)/settings" asChild>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Settings</Text>
            </Pressable>
          </Link>
          <Pressable style={styles.signOutButton} onPress={() => dispatch(signOut())}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search tasks"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            dispatch(setFilters({ search: value }));
          }}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filtersRow}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.chipRow}>
          {statusFilters.map((option) => {
            const selected = filters.status === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() =>
                  dispatch(
                    setFilters({
                      status: option.id === 'all' ? 'all' : (option.id as Task['status']),
                    })
                  )
                }
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.filtersRow}>
        <Text style={styles.sectionTitle}>Sort</Text>
        <View style={styles.chipRow}>
          {sortOptions.map((option) => {
            const selected = filters.sortBy === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => dispatch(setFilters({ sortBy: option.id }))}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.sortDirection} onPress={toggleSortDirection}>
            <Text style={styles.sortDirectionText}>{filters.sortDirection === 'asc' ? '↑' : '↓'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        {tasksState.status === 'syncing' && <ActivityIndicator size="small" color="#6366F1" />}
        {tasksState.lastSyncedAt && (
          <Text style={styles.syncMeta}>Synced {formatRelativeTime(tasksState.lastSyncedAt)}</Text>
        )}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={tasks.length ? styles.listContent : styles.emptyState}
        refreshControl={<RefreshControl refreshing={tasksState.status === 'loading'} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              {profile?.role === 'admin'
                ? 'Create a task to get started.'
                : 'Your admin will assign tasks shortly.'}
            </Text>
          </View>
        }
      />

      {profile?.role === 'admin' && (
        <Link href="/(app)/task/new" asChild>
          <Pressable style={styles.fab}>
            <Text style={styles.fabText}>＋</Text>
          </Pressable>
        </Link>
      )}
    </SafeAreaView>
  );
}

function statusBadgeColor(status: Task['status']) {
  switch (status) {
    case 'completed':
      return { backgroundColor: '#DCFCE7' };
    case 'in_progress':
      return { backgroundColor: '#FEF3C7' };
    default:
      return { backgroundColor: '#E0E7FF' };
  }
}

function formatStatus(status: Task['status']) {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'not_started':
      return 'Not started';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338CA',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748B',
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5F5',
    paddingHorizontal: 16,
    fontSize: 16,
  },
  filtersRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  chipText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  sortDirection: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDirectionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4338CA',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  syncMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  emptyState: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    paddingRight: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  metaValueWarning: {
    color: '#B45309',
  },
  emptyBox: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4338CA',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    lineHeight: 34,
  },
});

