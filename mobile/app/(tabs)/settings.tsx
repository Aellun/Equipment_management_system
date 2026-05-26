import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../../components/ui";
import {
  exportBackup,
  listAutoBackups,
  readBackupFile,
  restoreBackup,
  runDailyAutoBackup,
  type AutoBackupInfo,
} from "../../lib/backup";
import { notifyIfOverdue, scheduleDailyOverdueCheck } from "../../lib/notifications";
import {
  biometricAvailable,
  clearPin,
  hasPin,
  isLockEnabled,
  setLockEnabled,
  setPin,
} from "../../lib/security";
import { colors } from "../../lib/theme";

export default function SettingsScreen() {
  const [lockOn, setLockOn] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  const [autoBackups, setAutoBackups] = useState<AutoBackupInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const refresh = useCallback(() => {
    isLockEnabled().then(setLockOn);
    hasPin().then(setPinExists);
    biometricAvailable().then(setBioOk);
    listAutoBackups().then(setAutoBackups);
  }, []);
  useFocusEffect(useCallback(() => refresh(), [refresh]));

  // ---- Backup ----
  async function doExport() {
    setBusy(true);
    try {
      await exportBackup();
    } catch (e: any) {
      Alert.alert("Backup", e.message ?? "Could not create backup");
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    Alert.alert(
      "Restore backup",
      "This REPLACES all current data with the backup. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const text = await readBackupFile(res.assets[0].uri);
              await restoreBackup(text);
              Alert.alert("Restored", "Your data has been restored.");
              refresh();
            } catch (e: any) {
              Alert.alert("Restore failed", e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function restoreAuto(info: AutoBackupInfo) {
    Alert.alert(
      "Restore auto-backup",
      `Restore the snapshot from ${info.date}? This replaces all current data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const text = await readBackupFile(info.path);
              await restoreBackup(text);
              Alert.alert("Restored", `Data restored from ${info.date}.`);
              refresh();
            } catch (e: any) {
              Alert.alert("Restore failed", e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function backupNow() {
    setBusy(true);
    try {
      await runDailyAutoBackup();
      refresh();
      Alert.alert("Done", "A snapshot was saved to app storage.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Security ----
  async function toggleLock(value: boolean) {
    if (value) {
      if (!(await hasPin())) {
        setPinModal(true); // must set a PIN first
        return;
      }
      await setLockEnabled(true);
      setLockOn(true);
    } else {
      await setLockEnabled(false);
      setLockOn(false);
    }
  }

  async function savePin() {
    if (!/^\d{4,6}$/.test(pinInput)) {
      Alert.alert("Invalid PIN", "Use 4 to 6 digits.");
      return;
    }
    if (pinInput !== pinConfirm) {
      Alert.alert("PIN mismatch", "The two PINs do not match.");
      return;
    }
    await setPin(pinInput);
    await setLockEnabled(true);
    setPinModal(false);
    setPinInput("");
    setPinConfirm("");
    refresh();
    Alert.alert("App lock enabled", "You'll be asked to unlock on next launch.");
  }

  function removePin() {
    Alert.alert("Remove PIN & lock", "Disable the app lock and delete the PIN?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await clearPin();
          await setLockEnabled(false);
          refresh();
        },
      },
    ]);
  }

  // ---- Notifications ----
  async function enableNotifications() {
    setBusy(true);
    try {
      await scheduleDailyOverdueCheck();
      const n = await notifyIfOverdue();
      Alert.alert(
        "Notifications on",
        n > 0
          ? `You have ${n} overdue checkout(s) — a notification was sent.`
          : "Daily overdue checks are scheduled."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {/* Backup */}
      <Text style={styles.section}>Data Backup</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Export a backup file you can save to Google Drive or email. After an app
          upgrade, restore it to recover all your data.
        </Text>
        <View style={{ height: 12 }} />
        <Button title="Export Backup File" onPress={doExport} disabled={busy} />
        <View style={{ height: 8 }} />
        <Button title="Restore From File" variant="ghost" onPress={doImport} disabled={busy} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Automatic daily backups</Text>
        <Text style={styles.cardText}>
          A snapshot is saved on the device each day (last 7 kept).
        </Text>
        <View style={{ height: 10 }} />
        <Button title="Back Up Now" variant="ghost" onPress={backupNow} disabled={busy} />
        {autoBackups.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {autoBackups.map((b) => (
              <Pressable key={b.name} style={styles.autoRow} onPress={() => restoreAuto(b)}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={styles.autoDate}>{b.date}</Text>
                <Text style={styles.autoRestore}>Restore</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Security */}
      <Text style={styles.section}>Security</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>App lock</Text>
            <Text style={styles.cardText}>
              Require a PIN{bioOk ? " or biometrics" : ""} to open the app.
            </Text>
          </View>
          <Switch
            value={lockOn}
            onValueChange={toggleLock}
            trackColor={{ true: colors.primary }}
          />
        </View>
        {pinExists && (
          <>
            <View style={{ height: 10 }} />
            <Button title="Change PIN" variant="ghost" onPress={() => setPinModal(true)} />
            <View style={{ height: 8 }} />
            <Button title="Remove PIN & Lock" variant="danger" onPress={removePin} />
          </>
        )}
      </View>

      {/* Notifications */}
      <Text style={styles.section}>Overdue Notifications</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Get a daily reminder when equipment is past its due date, even when the
          app is closed.
        </Text>
        <View style={{ height: 12 }} />
        <Button title="Enable Overdue Alerts" onPress={enableNotifications} disabled={busy} />
      </View>

      <Text style={styles.footer}>Equipment Tracker v1.1 · offline · single-user</Text>

      {/* PIN modal */}
      <Modal visible={pinModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.modalTitle}>Set App PIN</Text>
          <Text style={styles.cardText}>Choose a 4–6 digit PIN.</Text>
          <View style={{ height: 16 }} />
          <Text style={styles.cardLabel}>New PIN</Text>
          <TextInput
            style={styles.pinInput}
            value={pinInput}
            onChangeText={setPinInput}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
          />
          <View style={{ height: 12 }} />
          <Text style={styles.cardLabel}>Confirm PIN</Text>
          <TextInput
            style={styles.pinInput}
            value={pinConfirm}
            onChangeText={setPinConfirm}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
          />
          <View style={{ height: 20 }} />
          <Button title="Save PIN" onPress={savePin} />
          <View style={{ height: 8 }} />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => {
              setPinModal(false);
              setPinInput("");
              setPinConfirm("");
            }}
          />
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardText: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 2 },
  switchRow: { flexDirection: "row", alignItems: "center" },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  autoDate: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "600" },
  autoRestore: { fontSize: 13, color: colors.primary, fontWeight: "700" },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 6 },
  pinInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 8,
    color: colors.text,
  },
});
