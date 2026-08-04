import DashboardPage from "@/app/components/services/pages/DashboardPage";
import { HYGIENE } from "@/app/components/hygiene/brand";

export const metadata = { title: "My bookings" };

export default function Page() {
  return <DashboardPage basePath={HYGIENE.basePath} label="Bookings" />;
}
