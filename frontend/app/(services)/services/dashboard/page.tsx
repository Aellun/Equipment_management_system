import DashboardPage from "@/app/components/services/pages/DashboardPage";
import { SERVICES } from "@/app/components/services/configs";

export default function Page() {
  return <DashboardPage basePath={SERVICES.shell.basePath} label="Bookings" />;
}
