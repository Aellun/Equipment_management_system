import type { Metadata } from "next";
import ServicesAuthProvider from "@/app/components/services/ServicesAuthProvider";
import HygieneShell from "@/app/components/hygiene/HygieneShell";
import { HYGIENE } from "@/app/components/hygiene/brand";

export const metadata: Metadata = {
  title: {
    default: `${HYGIENE.name} — ${HYGIENE.tagline}`,
    template: `%s · ${HYGIENE.name}`,
  },
  description:
    "Kenyan-owned hygiene, sanitation and cleaning solutions — professional cleaning for commercial, residential, institutional, healthcare, industrial and hospitality facilities, plus hygiene product and sanitary pad supply.",
};

export default function HygieneLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServicesAuthProvider>
      <HygieneShell>{children}</HygieneShell>
    </ServicesAuthProvider>
  );
}
