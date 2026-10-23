import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/features/system";
import { RequirePermission } from "@/components/app/require-permission";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequirePermission perm="audit:read"><AuditPage /></RequirePermission>,
});
