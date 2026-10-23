import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/permissions";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Lala Salama — Hostel Security & Management" },
      { name: "description", content: "Sign in to manage hostel residents, visitors, access control, incidents and payments." },
      { property: "og:title", content: "Lala Salama — Hostel Security & Management" },
      { property: "og:description", content: "Hostel security and management platform." },
    ],
  }),
  beforeLoad: () => {
    const s = getSession();
    throw redirect({ to: s ? ROLE_HOME[s.user.role] : "/login" });
  },
});
