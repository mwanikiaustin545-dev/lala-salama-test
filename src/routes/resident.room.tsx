import { createFileRoute } from "@tanstack/react-router";
import { MyRoom } from "@/features/accommodation";

export const Route = createFileRoute("/resident/room")({
  head: () => ({ meta: [{ title: "My Room — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <MyRoom />,
});
