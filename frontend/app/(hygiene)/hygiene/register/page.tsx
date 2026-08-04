import RegisterPage from "@/app/components/services/pages/RegisterPage";
import { HYGIENE } from "@/app/components/hygiene/brand";

export const metadata = { title: "Create an account" };

export default function Page() {
  return <RegisterPage basePath={HYGIENE.basePath} label="Hygiene" />;
}
