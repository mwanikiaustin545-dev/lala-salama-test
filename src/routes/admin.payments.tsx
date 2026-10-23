import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/features/operations";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <PaymentsPage />,
});
