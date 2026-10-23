import { createFileRoute } from "@tanstack/react-router";
import { ResidentProfile } from "@/features/residents";

export const Route = createFileRoute("/security/residents/$id")({
  head: () => ({ meta: [{ title: "Resident Profile — Lala Salama" }, { name: "robots", content: "noindex" }] }),
  component: function ResidentRoute() {
    const { id } = Route.useParams();
    return <ResidentProfile id={id} />;
  },
});
