import { redirect } from "next/navigation";

// By default the browser lands on the public storefront.
export default function RootPage() {
  redirect("/store");
}
