import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/system";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <ReportsPage />,
});
