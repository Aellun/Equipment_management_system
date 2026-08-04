import ErrandsAccount from "@/app/components/services/pages/ErrandsAccount";
import { SERVICES } from "@/app/components/services/configs";

export const metadata = { title: "My errands" };

export default function Page() {
  return <ErrandsAccount basePath={SERVICES.shell.basePath} />;
}
