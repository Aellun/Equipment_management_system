import { redirect } from "next/navigation";

// Errands & Hygiene were merged into one Dyzah Services area.
export default function Page() {
  redirect("/services");
}
