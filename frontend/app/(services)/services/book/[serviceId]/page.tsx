"use client";

import { useParams } from "next/navigation";
import BookingPage from "@/app/components/services/pages/BookingPage";
import { SERVICES } from "@/app/components/services/configs";

export default function Page() {
  const { serviceId } = useParams<{ serviceId: string }>();
  return <BookingPage vertical={SERVICES.vertical} basePath={SERVICES.shell.basePath} serviceId={serviceId} />;
}
