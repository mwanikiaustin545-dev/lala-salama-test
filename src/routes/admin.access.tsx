import { createFileRoute } from "@tanstack/react-router";
import { AccessPage } from "@/features/security";

export const Route = createFileRoute("/admin/access")({
  head: () => ({ meta: [{ title: "Access Control — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AccessPage />,
});
