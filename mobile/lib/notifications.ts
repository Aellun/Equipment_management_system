import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { listOverdueCheckouts } from "./crud";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationSetup(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("overdue", {
      name: "Overdue equipment",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#4f46e5",
    });
  }
  return granted;
}

// Schedule a repeating daily check at 09:00 that surfaces overdue items.
export async function scheduleDailyOverdueCheck(): Promise<void> {
  const granted = await ensureNotificationSetup();
  if (!granted) return;

  // Avoid stacking duplicate schedules.
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.content.data?.kind === "overdue-daily") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Equipment check",
      body: "Open Equipment Tracker to review any overdue items.",
      data: { kind: "overdue-daily" },
      ...(Platform.OS === "android" ? { channelId: "overdue" } : {}),
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}

// Fire an immediate notification if anything is overdue right now.
export async function notifyIfOverdue(): Promise<number> {
  const granted = await ensureNotificationSetup();
  const overdue = await listOverdueCheckouts();
  if (overdue.length === 0 || !granted) return overdue.length;

  const units = overdue.reduce((s, c) => s + (c.open_units ?? 0), 0);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${overdue.length} overdue checkout${overdue.length > 1 ? "s" : ""}`,
      body: `${units} unit(s) past their due date. Tap to send reminders.`,
      data: { kind: "overdue-now" },
      ...(Platform.OS === "android" ? { channelId: "overdue" } : {}),
    },
    trigger: null, // immediate
  });
  return overdue.length;
}
