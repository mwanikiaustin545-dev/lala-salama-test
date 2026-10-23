import { createFileRoute } from "@tanstack/react-router";
import { MonitoringPage } from "@/features/dashboards";

export const Route = createFileRoute("/admin/monitoring")({
  head: () => ({ meta: [{ title: "Security Monitoring — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <MonitoringPage />,
});
