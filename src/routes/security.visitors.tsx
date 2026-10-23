import { createFileRoute } from "@tanstack/react-router";
import { VisitorsPage } from "@/features/security";

export const Route = createFileRoute("/security/visitors")({
  head: () => ({ meta: [{ title: "Visitors — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <VisitorsPage />,
});
