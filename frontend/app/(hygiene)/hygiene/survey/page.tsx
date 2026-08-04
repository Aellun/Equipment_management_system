import { Suspense } from "react";
import SurveyRequest from "@/app/components/hygiene/SurveyRequest";

export const metadata = {
  title: "Book a free site survey",
  description:
    "We visit your site, measure the work and send a fixed quote — free and without obligation.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SurveyRequest />
    </Suspense>
  );
}
