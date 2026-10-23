import { createFileRoute } from "@tanstack/react-router";
import { MaintenancePage } from "@/features/operations";

export const Route = createFileRoute("/resident/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <MaintenancePage />,
});
