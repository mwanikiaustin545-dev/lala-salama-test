import { createFileRoute } from "@tanstack/react-router";
import { EmergencyPage } from "@/features/security";

export const Route = createFileRoute("/admin/emergency")({
  head: () => ({ meta: [{ title: "Emergency — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <EmergencyPage />,
});
