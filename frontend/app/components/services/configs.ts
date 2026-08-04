import type { ShellConfig } from "./ServicesShell";
import type { LandingContent } from "./pages/LandingPage";

// Errands and Hygiene are combined into one client-facing "Dyzah Services"
// area. The catalog spans both verticals (errands + hygiene); `vertical:
// undefined` means "list everything".
export const SERVICES: { shell: ShellConfig; vertical?: string; landing: LandingContent } = {
  vertical: undefined,
  shell: {
    label: "Services",
    basePath: "/services",
    tagline: "Errands, deliveries, sanitary collection, laundry & cleaning — across Nairobi.",
  },
  landing: {
    label: "Services",
    basePath: "/services",
    eyebrow: "Trusted services across Nairobi",
    headline: "Errands & hygiene, handled.",
    headlineAccent: "Pay only when it's done right.",
    intro:
      "From groceries, deliveries and government queues to sanitary bucket collection, laundry and office cleaning — a verified crew handles it. Transparent pricing, direct M-Pesa payment and photo proof on every job.",
    categories: [
      ["shopping-cart", "Everyday Errands", "Groceries, pharmacy, parcels, deliveries"],
      ["landmark", "Government & Banking", "Huduma, NTSA, bank runs, documents"],
      ["trash", "Sanitary & Waste", "Bucket & bin collection for schools & offices"],
      ["shirt", "Laundry & Cleaning", "Wash & fold, ironing, deep cleaning, fumigation"],
    ],
  },
};
