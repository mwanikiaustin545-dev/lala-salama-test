import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/features/system";
import { RequirePermission } from "@/components/app/require-permission";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequirePermission perm="users:read"><UsersPage /></RequirePermission>,
});
