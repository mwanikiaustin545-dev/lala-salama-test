import { createFileRoute } from "@tanstack/react-router";
import { SecurityDashboard } from "@/features/dashboards";

export const Route = createFileRoute("/security/dashboard")({
  head: () => ({ meta: [{ title: "Security Dashboard — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <SecurityDashboard />,
});
