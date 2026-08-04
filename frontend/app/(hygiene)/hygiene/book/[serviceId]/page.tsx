"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import CleaningBooking from "@/app/components/hygiene/CleaningBooking";

export default function Page() {
  const { serviceId } = useParams<{ serviceId: string }>();
  return (
    <Suspense fallback={null}>
      <CleaningBooking serviceId={serviceId} />
    </Suspense>
  );
}
