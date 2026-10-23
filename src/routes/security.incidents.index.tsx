import { createFileRoute } from "@tanstack/react-router";
import { IncidentsPage } from "@/features/security";

export const Route = createFileRoute("/security/incidents/")({
  head: () => ({ meta: [{ title: "Incidents — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <IncidentsPage />,
});
