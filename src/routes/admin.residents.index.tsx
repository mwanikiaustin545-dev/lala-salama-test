import { createFileRoute } from "@tanstack/react-router";
import { ResidentsPage } from "@/features/residents";

export const Route = createFileRoute("/admin/residents/")({
  head: () => ({ meta: [{ title: "Residents — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <ResidentsPage />,
});
