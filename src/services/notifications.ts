import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerNotificationChannel() {
  if (!Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permissions not granted');
    return;
  }

  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function scheduleTaskReminder(opts: { title: string; body: string; secondsFromNow: number }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      sound: undefined,
    },
    trigger: { seconds: opts.secondsFromNow },
  });
}

export async function registerPushToken() {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}





