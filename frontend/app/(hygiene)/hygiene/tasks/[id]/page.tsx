"use client";

import { useParams } from "next/navigation";
import TaskDetailPage from "@/app/components/services/pages/TaskDetailPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <TaskDetailPage id={id} />;
}
