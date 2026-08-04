import { Suspense } from "react";
import HygieneCatalog from "@/app/components/hygiene/HygieneCatalog";

export const metadata = {
  title: "Cleaning services",
  description:
    "Home, office, school, healthcare, industrial and hospitality cleaning, plus washroom hygiene, sanitary bins, waste control and laundry.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HygieneCatalog />
    </Suspense>
  );
}
