import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { getSession } from "@/lib/auth/session";
import { AREA_ROLES } from "@/lib/auth/permissions";

// Client-only protected area: session lives in browser storage, so SSR is off.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => {
    const s = getSession();
    if (!s) throw redirect({ to: "/login" });
    if (!AREA_ROLES.admin.includes(s.user.role)) throw redirect({ to: "/unauthorized" });
  },
  component: () => (
    <AppShell area="admin">
      <Outlet />
    </AppShell>
  ),
});
