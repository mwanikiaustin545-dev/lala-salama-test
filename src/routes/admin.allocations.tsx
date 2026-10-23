import { createFileRoute } from "@tanstack/react-router";
import { AllocationsPage } from "@/features/accommodation";

export const Route = createFileRoute("/admin/allocations")({
  head: () => ({ meta: [{ title: "Allocations — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AllocationsPage />,
});
