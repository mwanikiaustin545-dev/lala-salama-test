import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/system";
import { RequirePermission } from "@/components/app/require-permission";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequirePermission perm="settings:read"><SettingsPage /></RequirePermission>,
});
