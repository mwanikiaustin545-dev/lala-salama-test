import { createFileRoute } from "@tanstack/react-router";
import { VisitorsPage } from "@/features/security";

export const Route = createFileRoute("/resident/visitors")({
  head: () => ({ meta: [{ title: "My Visitors — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <VisitorsPage />,
});
