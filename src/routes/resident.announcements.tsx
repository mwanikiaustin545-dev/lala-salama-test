import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementsPage } from "@/features/operations";

export const Route = createFileRoute("/resident/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AnnouncementsPage />,
});
