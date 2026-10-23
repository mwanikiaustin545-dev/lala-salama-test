import { createFileRoute } from "@tanstack/react-router";
import { LostFoundPage } from "@/features/security";

export const Route = createFileRoute("/admin/lost-found")({
  head: () => ({ meta: [{ title: "Lost & Found — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <LostFoundPage />,
});
