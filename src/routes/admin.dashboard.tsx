import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/dashboards";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminDashboard />,
});
