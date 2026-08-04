import type { ShellConfig } from "./ServicesShell";
import type { LandingContent } from "./pages/LandingPage";

// Dyzah Errands. Hygiene is a separate business with its own branded site at
// /hygiene (see app/(hygiene) and app/components/hygiene) — it shares this
// booking/payment engine but nothing of this surface, so the catalog here is
// pinned to `vertical: "errands"`.
export const SERVICES: { shell: ShellConfig; vertical?: string; landing: LandingContent } = {
  vertical: "errands",
  shell: {
    label: "Errands",
    basePath: "/services",
    tagline: "Errands, deliveries, government queues & diaspora support — across Nairobi.",
  },
  landing: {
    label: "Errands",
    basePath: "/services",
    eyebrow: "Trusted errands across Nairobi",
    headline: "Your errands, handled.",
    headlineAccent: "Pay only when it's done right.",
    intro:
      "From groceries, deliveries and pharmacy runs to government queues, bank errands and diaspora check-ins — a verified runner handles it. Transparent pricing, direct M-Pesa payment and photo proof on every job.",
    categories: [
      ["shopping-cart", "Everyday Errands", "Groceries, pharmacy, parcels, deliveries"],
      ["landmark", "Government & Banking", "Huduma, NTSA, bank runs, documents"],
      ["file-text", "Documents & Courier", "Confidential document pickup and delivery"],
      ["home", "Diaspora Support", "Property checks, bill payments, family visits"],
    ],
  },
};
