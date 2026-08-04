import { Suspense } from "react";
import EventsCatalog from "@/app/components/events/EventsCatalog";

export const metadata = { title: "Hire equipment" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventsCatalog />
    </Suspense>
  );
}
