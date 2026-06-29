import LandingPage from "@/app/components/services/pages/LandingPage";
import { SERVICES } from "@/app/components/services/configs";

export default function Page() {
  return <LandingPage content={SERVICES.landing} />;
}
