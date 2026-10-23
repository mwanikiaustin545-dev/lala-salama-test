import { createFileRoute } from "@tanstack/react-router";
import { ComplaintsPage } from "@/features/operations";

export const Route = createFileRoute("/admin/complaints")({
  head: () => ({ meta: [{ title: "Complaints — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComplaintsPage />,
});
