import { createFileRoute } from "@tanstack/react-router";
import { StaffPage } from "@/features/operations";
import { RequirePermission } from "@/components/app/require-permission";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({ meta: [{ title: "Staff — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequirePermission perm="staff:read"><StaffPage /></RequirePermission>,
});
