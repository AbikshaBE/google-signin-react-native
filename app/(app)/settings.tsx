import { useAppDispatch, useAppSelector } from '@/src/hooks';
import { registerPushToken, scheduleTaskReminder } from '@/src/services/notifications';
import { syncOfflineQueue } from '@/src/store/tasksSlice';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const network = useAppSelector((state) => state.network);
  const queueLength = useAppSelector((state) => state.tasks.offlineQueue.length);
  const lastSyncedAt = useAppSelector((state) => state.tasks.lastSyncedAt);

  const triggerReminder = async () => {
    await scheduleTaskReminder({
      title: 'Task follow-up',
      body: 'Remember to review your assigned tasks.',
      secondsFromNow: 2,
    });
    setFeedback('Reminder scheduled for 2 seconds from now.');
  };

  const registerToken = async () => {
    const token = await registerPushToken();
    if (token) {
      setPushToken(token);
      setFeedback('Push token registered. Add it to your backend to send pushes.');
    } else {
      setFeedback('Token unavailable on simulator.');
    }
  };

  const onManualSync = () => {
    dispatch(syncOfflineQueue());
    setFeedback('Sync requested.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Settings & Diagnostics</Text>
      <Text style={styles.subtitle}>Check connectivity, offline queue state, and notifications.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connectivity</Text>
        <Text style={styles.item}>Status: {network.isConnected ? 'Online' : 'Offline'}</Text>
        <Text style={styles.item}>Offline queue: {queueLength} actions</Text>
        <Text style={styles.item}>Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : '—'}</Text>
        <Pressable style={styles.button} onPress={onManualSync}>
          <Text style={styles.buttonText}>Force sync now</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Pressable style={styles.button} onPress={triggerReminder}>
          <Text style={styles.buttonText}>Schedule test reminder</Text>
        </Pressable>
        <Pressable style={styles.buttonSecondary} onPress={registerToken}>
          <Text style={styles.buttonSecondaryText}>Register device push token</Text>
        </Pressable>
        {pushToken && (
          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>Expo push token</Text>
            <Text style={styles.tokenValue}>{pushToken}</Text>
          </View>
        )}
      </View>

      {feedback && <Text style={styles.feedback}>{feedback}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
    backgroundColor: '#F8FAFC',
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  item: {
    fontSize: 14,
    color: '#475569',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4338CA',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#4338CA',
    fontSize: 15,
    fontWeight: '600',
  },
  tokenBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#4338CA',
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 12,
    color: '#1E293B',
  },
  feedback: {
    fontSize: 13,
    color: '#10B981',
  },
});




