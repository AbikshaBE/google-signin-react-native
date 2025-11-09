import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSelector } from '@/src/hooks';
import { useTaskSync } from '@/src/hooks/useTaskSync';
import { AppProvider } from '@/src/providers/AppProvider';
import { registerNotificationChannel } from '@/src/services/notifications';
import { useEffect } from 'react';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const session = useAppSelector((state) => state.auth.session);

  useTaskSync();

  useEffect(() => {
    registerNotificationChannel();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName={session ? '(app)' : '(auth)'}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
