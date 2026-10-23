import { createFileRoute } from "@tanstack/react-router";
import { IncidentFormPage } from "@/features/security";

export const Route = createFileRoute("/security/incidents/new")({
  head: () => ({ meta: [{ title: "Report Incident — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <IncidentFormPage />,
});
