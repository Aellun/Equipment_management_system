import { Alert, Linking } from "react-native";
import { getCheckoutLines } from "./crud";
import type { Checkout } from "./types";

// Strip a phone number down to digits for the wa.me deep link.
function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) return p.slice(1);
  // Kenyan local format 07XXXXXXXX -> 2547XXXXXXXX
  if (p.startsWith("0")) return "254" + p.slice(1);
  return p;
}

export async function buildReminderMessage(checkout: Checkout): Promise<string> {
  const lines = await getCheckoutLines(checkout.id);
  const items = lines
    .filter((l) => (l.outstanding ?? 0) > 0)
    .map((l) => `• ${l.outstanding} × ${l.equipment_name}`)
    .join("\n");
  return (
    `Hello ${checkout.client_name},\n\n` +
    `This is a friendly reminder that the following equipment was due on ${checkout.due_date} ` +
    `and is now overdue:\n\n${items}\n\n` +
    `Kindly arrange to return it at your earliest convenience. Thank you.`
  );
}

// Open WhatsApp with a prefilled overdue reminder.
export async function sendWhatsAppReminder(
  checkout: Checkout,
  phone: string | null
): Promise<void> {
  if (!phone || !phone.trim()) {
    Alert.alert("No phone number", `${checkout.client_name} has no phone number on file.`);
    return;
  }
  const message = await buildReminderMessage(checkout);
  const num = normalizePhone(phone);
  const url = `whatsapp://send?phone=${num}&text=${encodeURIComponent(message)}`;
  const webUrl = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : webUrl);
  } catch {
    Alert.alert("Could not open WhatsApp", "Make sure WhatsApp is installed.");
  }
}
