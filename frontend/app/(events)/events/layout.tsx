import type { Metadata } from "next";
import EventsShell from "@/app/components/events/EventsShell";

export const metadata: Metadata = {
  title: { default: "Dyzah Events — Event equipment hire", template: "%s · Dyzah Events" },
  description:
    "Hire chairs, tables, tents, sound, lighting, power and catering equipment for weddings, corporate events and conferences. Delivery, setup and collection across Kenya.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <EventsShell>{children}</EventsShell>;
}
