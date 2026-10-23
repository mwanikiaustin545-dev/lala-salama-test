import { createFileRoute } from "@tanstack/react-router";
import { RoomsPage } from "@/features/accommodation";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({ meta: [{ title: "Rooms — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <RoomsPage />,
});
