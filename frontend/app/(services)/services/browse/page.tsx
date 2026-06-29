import ServicesPage from "@/app/components/services/pages/ServicesPage";
import { SERVICES } from "@/app/components/services/configs";

export default function Page() {
  return <ServicesPage vertical={SERVICES.vertical} basePath={SERVICES.shell.basePath} heading="All Dyzah services" />;
}
