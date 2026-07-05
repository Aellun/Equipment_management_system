import { redirect } from "next/navigation";

// By default the browser lands on the Dyzah home hub, which fans out to
// Store, Services and the Admin console.
export default function RootPage() {
  redirect("/home");
}
