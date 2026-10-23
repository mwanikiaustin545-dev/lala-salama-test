import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/features/system";

export const Route = createFileRoute("/security/account")({
  head: () => ({ meta: [{ title: "Account — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AccountPage />,
});
