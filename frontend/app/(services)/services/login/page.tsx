"use client";

import { Suspense } from "react";
import LoginPage from "@/app/components/services/pages/LoginPage";
import { SERVICES } from "@/app/components/services/configs";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage basePath={SERVICES.shell.basePath} />
    </Suspense>
  );
}
