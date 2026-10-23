import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/features/system";

export const Route = createFileRoute("/security/audit")({
  head: () => ({ meta: [{ title: "Audit Trail — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: () => <AuditPage />,
});
