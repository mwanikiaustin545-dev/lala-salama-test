import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/features/operations";

export const Route = createFileRoute("/security/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <NotificationsPage />,
});
