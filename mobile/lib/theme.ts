export const colors = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  primary: "#4f46e5",
  primaryText: "#ffffff",
  danger: "#dc2626",
  sidebar: "#0f172a",

  statusAvailable: "#16a34a",
  statusOut: "#d97706",
  statusMaintenance: "#dc2626",
};

export function statusColor(status: string): string {
  if (status === "Available") return colors.statusAvailable;
  if (status === "Out") return colors.statusOut;
  return colors.statusMaintenance;
}
