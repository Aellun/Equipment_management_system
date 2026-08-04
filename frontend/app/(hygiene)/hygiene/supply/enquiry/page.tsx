import EnquiryForm from "@/app/components/hygiene/EnquiryForm";

export const metadata = {
  title: "Request a supply quote",
  description:
    "Tell Dyzah Hygiene what hygiene products or sanitary pads your organisation needs and we will prepare a quote.",
};

export default function Page() {
  return <EnquiryForm />;
}
