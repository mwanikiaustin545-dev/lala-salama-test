import { createFileRoute } from "@tanstack/react-router";
import { OutstandingPage } from "@/features/operations";

export const Route = createFileRoute("/admin/outstanding")({
  head: () => ({ meta: [{ title: "Outstanding Payments — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <OutstandingPage />,
});
