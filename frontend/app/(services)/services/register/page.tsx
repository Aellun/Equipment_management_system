import RegisterPage from "@/app/components/services/pages/RegisterPage";
import { SERVICES } from "@/app/components/services/configs";

export default function Page() {
  return <RegisterPage basePath={SERVICES.shell.basePath} label={SERVICES.shell.label} />;
}
