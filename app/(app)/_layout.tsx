import { useAppSelector } from '@/src/hooks';
import { Redirect, Stack } from 'expo-router';

export default function AppLayout() {
  const session = useAppSelector((state) => state.auth.session);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: 'Task Dashboard', headerShown: false }} />
      <Stack.Screen name="task/[id]" options={{ title: 'Task Details', presentation: 'modal' }} />
      <Stack.Screen name="task/new" options={{ title: 'Create Task', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

