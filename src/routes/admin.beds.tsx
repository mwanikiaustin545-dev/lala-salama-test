import { createFileRoute } from "@tanstack/react-router";
import { BedsPage } from "@/features/accommodation";

export const Route = createFileRoute("/admin/beds")({
  head: () => ({ meta: [{ title: "Beds — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <BedsPage />,
});
