import { createFileRoute } from "@tanstack/react-router";
import { EmergencyPage } from "@/features/security";

export const Route = createFileRoute("/security/emergency")({
  head: () => ({ meta: [{ title: "Emergency Contacts — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <EmergencyPage />,
});
