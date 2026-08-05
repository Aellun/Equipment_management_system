import ServicesPage from "@/app/components/services/pages/ServicesPage";
import { SERVICES } from "@/app/components/services/configs";

// `searchParams` makes this dynamic, so navigating the header category rail
// (which changes ?q=) re-renders here; the `key` remounts the listing so the
// new query actually filters — otherwise clicking a rail tab looks inert.
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <ServicesPage
      key={q}
      vertical={SERVICES.vertical}
      basePath={SERVICES.shell.basePath}
      heading="Browse errands & services"
      initialQuery={q}
    />
  );
}
