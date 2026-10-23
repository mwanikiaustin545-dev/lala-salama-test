import { createFileRoute } from "@tanstack/react-router";
import { MaintenancePage } from "@/features/operations";

export const Route = createFileRoute("/admin/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <MaintenancePage />,
});
