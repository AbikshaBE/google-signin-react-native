import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/src/hooks';
import { deleteTask, updateTask } from '@/src/store/tasksSlice';
import type { Task } from '@/src/types';

const statusOptions: { label: string; value: Task['status'] }[] = [
  { label: 'Not started', value: 'not_started' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const task = useAppSelector((state) => (id ? state.tasks.entities[id] : undefined));
  const profile = useAppSelector((state) => state.auth.profile);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : '');
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'not_started');

  const editableFields = useMemo(() => profile?.role === 'admin', [profile?.role]);
  const canUpdateStatus = useMemo(() => profile?.role === 'admin' || profile?.role === 'member', [profile?.role]);

  useEffect(() => {
    if (!task) {
      Alert.alert('Not found', 'This task could not be located.', [{ text: 'Back', onPress: () => router.back() }]);
    }
  }, [task, router]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssignedTo(task.assignedTo);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      setStatus(task.status);
    }
  }, [task]);

  if (!task) {
    return null;
  }

  const handleSave = async () => {
    if (!title.trim() || !assignedTo.trim()) {
      Alert.alert('Missing details', 'Title and assignee are required.');
      return;
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD for due date.');
      return;
    }

    const result = await dispatch(
      updateTask({
        id: task.id,
        changes: {
          title: editableFields ? title.trim() : undefined,
          description: editableFields ? description.trim() : undefined,
          assignedTo: editableFields ? assignedTo.trim() : undefined,
          dueDate: editableFields ? (dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null) : undefined,
          status,
          completed: status === 'completed',
        },
      })
    );

    if (updateTask.rejected.match(result)) {
      Alert.alert('Update failed', result.payload as string);
    } else {
      router.back();
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete task', 'This cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(deleteTask(task.id));
          if (deleteTask.rejected.match(result)) {
            Alert.alert('Delete failed', result.payload as string);
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      contentContainerStyle={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>{task.title}</Text>
          <View style={[styles.badge, statusBadgeColor(task.status)]}>
            <Text style={styles.badgeText}>{formatStatus(task.status)}</Text>
          </View>
        </View>
        <Text style={styles.meta}>Created {formatDate(task.createdAt)} · Last updated {formatDate(task.updatedAt)}</Text>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} editable={editableFields} value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            editable={editableFields}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Assigned to</Text>
          <TextInput
            style={styles.input}
            editable={editableFields}
            value={assignedTo}
            onChangeText={setAssignedTo}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Assigned on</Text>
            <Text style={styles.staticField}>{formatDate(task.assignedDate)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Due date</Text>
            {editableFields ? (
              <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
            ) : (
              <Text style={styles.staticField}>{task.dueDate ? formatDate(task.dueDate) : '—'}</Text>
            )}
          </View>
        </View>

        {canUpdateStatus && (
          <View style={styles.fieldSet}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {statusOptions.map((option) => {
                const selected = status === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setStatus(option.value)}
                    style={[styles.statusChip, selected && styles.statusChipSelected]}
                  >
                    <Text style={[styles.statusText, selected && styles.statusTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save changes</Text>
        </Pressable>

        {editableFields && (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete task</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    paddingRight: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
  },
  fieldSet: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  multiline: {
    textAlignVertical: 'top',
    minHeight: 120,
  },
  staticField: {
    marginTop: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#FFFFFF',
  },
  statusChipSelected: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusTextSelected: {
    color: '#FFFFFF',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '700',
  },
});





