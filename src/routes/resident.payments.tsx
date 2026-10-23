import { createFileRoute } from "@tanstack/react-router";
import { MyPaymentsPage } from "@/features/operations";

export const Route = createFileRoute("/resident/payments")({
  head: () => ({ meta: [{ title: "My Payments — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <MyPaymentsPage />,
});
