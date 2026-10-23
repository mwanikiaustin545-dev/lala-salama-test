import { createFileRoute } from "@tanstack/react-router";
import { VisitorsPage } from "@/features/security";

export const Route = createFileRoute("/admin/visitors")({
  head: () => ({ meta: [{ title: "Visitors — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <VisitorsPage />,
});
