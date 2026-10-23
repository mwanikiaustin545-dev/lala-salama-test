import { createFileRoute } from "@tanstack/react-router";
import { ResidentDashboard } from "@/features/dashboards";

export const Route = createFileRoute("/resident/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <ResidentDashboard />,
});
