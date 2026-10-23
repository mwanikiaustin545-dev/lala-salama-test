import { createFileRoute } from "@tanstack/react-router";
import { MyProfile } from "@/features/residents";

export const Route = createFileRoute("/resident/profile")({
  head: () => ({ meta: [{ title: "My Profile — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <MyProfile />,
});
