import { redirect } from "next/navigation";

// Dyzah Errands lives at /services. (Dyzah Hygiene is a separate business
// with its own site at /hygiene.)
export default function Page() {
  redirect("/services");
}
