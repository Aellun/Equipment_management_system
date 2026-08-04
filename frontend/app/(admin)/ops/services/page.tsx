import AdminServices from "@/app/components/services/AdminServices";

// Dyzah Errands operations. Hygiene is a separate business with its own
// console at /ops/hygiene.
export default function Page() {
  return <AdminServices vertical="errands" label="Errands" />;
}
