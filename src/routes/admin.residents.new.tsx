import { createFileRoute } from "@tanstack/react-router";
import { ResidentNewPage } from "@/features/residents";

export const Route = createFileRoute("/admin/residents/new")({
  head: () => ({ meta: [{ title: "Add Resident — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <ResidentNewPage />,
});
