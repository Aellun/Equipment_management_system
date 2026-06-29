import ServicesAuthProvider from "@/app/components/services/ServicesAuthProvider";
import ServicesShell from "@/app/components/services/ServicesShell";
import { SERVICES } from "@/app/components/services/configs";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServicesAuthProvider>
      <ServicesShell config={SERVICES.shell}>{children}</ServicesShell>
    </ServicesAuthProvider>
  );
}
