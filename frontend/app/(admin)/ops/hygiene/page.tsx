import AdminServices from "@/app/components/services/AdminServices";

// Dyzah Hygiene operations — cleaning jobs plus the B2B supply enquiry
// pipeline, which only this business has.
export default function Page() {
  return <AdminServices vertical="hygiene" label="Hygiene" showEnquiries />;
}
