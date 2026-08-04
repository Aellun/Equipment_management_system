"use client";

import { Suspense } from "react";
import LoginPage from "@/app/components/services/pages/LoginPage";
import { HYGIENE } from "@/app/components/hygiene/brand";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage basePath={HYGIENE.basePath} />
    </Suspense>
  );
}
