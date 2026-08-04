import ServicesPage from "@/app/components/services/pages/ServicesPage";
import { HYGIENE } from "@/app/components/hygiene/brand";

export const metadata = {
  title: "Cleaning services",
  description:
    "Commercial, residential, institutional, healthcare, industrial and hospitality cleaning, plus sanitation, washroom hygiene, waste control and laundry services.",
};

export default function Page() {
  return (
    <ServicesPage
      vertical="hygiene"
      basePath={HYGIENE.basePath}
      heading="Our cleaning & hygiene services"
    />
  );
}
