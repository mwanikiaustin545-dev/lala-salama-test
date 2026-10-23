import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementsPage } from "@/features/operations";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AnnouncementsPage />,
});
