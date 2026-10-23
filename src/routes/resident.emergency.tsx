import { createFileRoute } from "@tanstack/react-router";
import { EmergencyPage } from "@/features/security";

export const Route = createFileRoute("/resident/emergency")({
  head: () => ({ meta: [{ title: "Emergency — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <EmergencyPage />,
});
