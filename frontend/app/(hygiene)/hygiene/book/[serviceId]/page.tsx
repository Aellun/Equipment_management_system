"use client";

import { useParams } from "next/navigation";
import BookingPage from "@/app/components/services/pages/BookingPage";
import { HYGIENE } from "@/app/components/hygiene/brand";

export default function Page() {
  const { serviceId } = useParams<{ serviceId: string }>();
  return <BookingPage vertical="hygiene" basePath={HYGIENE.basePath} serviceId={serviceId} />;
}
