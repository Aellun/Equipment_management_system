import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLockGate } from "../components/AppLock";
import { runDailyAutoBackup } from "../lib/backup";
import { CartProvider } from "../lib/CartContext";
import { scheduleDailyOverdueCheck } from "../lib/notifications";
import { colors } from "../lib/theme";

export default function RootLayout() {
  // Fire-and-forget startup tasks: daily backup + overdue notification schedule.
  useEffect(() => {
    runDailyAutoBackup().catch(() => {});
    scheduleDailyOverdueCheck().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppLockGate>
        <CartProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.sidebar },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="checkout" options={{ title: "Check Out Equipment" }} />
            <Stack.Screen name="cart" options={{ title: "Review & Confirm" }} />
            <Stack.Screen name="checkin" options={{ title: "Check In Equipment" }} />
          </Stack>
        </CartProvider>
      </AppLockGate>
    </SafeAreaProvider>
  );
}
