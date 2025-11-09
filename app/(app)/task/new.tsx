import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/src/hooks';
import { createTask } from '@/src/store/tasksSlice';

export default function CreateTaskScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.auth.profile);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>Restricted</Text>
        <Text style={styles.blockedSubtitle}>Only admins can create tasks.</Text>
        <Pressable onPress={() => router.back()} style={styles.blockedButton}>
          <Text style={styles.blockedButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!title.trim() || !assignedTo.trim()) {
      Alert.alert('Missing details', 'Title and assignee are required.');
      return;
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD for due date.');
      return;
    }

    const assignedDate = new Date().toISOString();
    const dueDateIso = dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null;

    const result = await dispatch(
      createTask({
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignedTo.trim(),
        assignedDate,
        dueDate: dueDateIso,
      })
    );

    if (createTask.fulfilled.match(result)) {
      router.back();
    } else if (createTask.rejected.match(result)) {
      Alert.alert('Create task failed', result.payload as string);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      contentContainerStyle={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>New task</Text>
        <Text style={styles.subtitle}>Outline the work, assign an owner, and set expectations.</Text>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            placeholder="Design onboarding flow"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Provide context, acceptance criteria, or links"
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Assigned to *</Text>
          <TextInput
            placeholder="alex@company.com"
            style={styles.input}
            value={assignedTo}
            onChangeText={setAssignedTo}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldSet}>
          <Text style={styles.label}>Due date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
          />
          <Text style={styles.helper}>Optional. Leave blank if not applicable.</Text>
        </View>

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Create task</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  fieldSet: {
    gap: 8,
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
  },
  helper: {
    fontSize: 12,
    color: '#94A3B8',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    gap: 16,
    padding: 24,
  },
  blockedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  blockedSubtitle: {
    fontSize: 16,
    color: '#CBD5F5',
    textAlign: 'center',
  },
  blockedButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4338CA',
  },
  blockedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});





