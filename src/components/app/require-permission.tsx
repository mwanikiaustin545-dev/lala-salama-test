import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import type { Permission } from "@/lib/auth/permissions";

export function Forbidden() {
  return (
    <div role="alert" className="glass mx-auto mt-10 max-w-md p-8 text-center">
      <ShieldX className="mx-auto size-10 text-destructive" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">Access denied</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your role does not have permission to view this page. This attempt has been noted.</p>
      <Link to="/" className="mt-5 inline-block text-sm text-primary hover:underline">Back to my dashboard</Link>
    </div>
  );
}

/** UI guard — the API layer enforces the same permission independently. */
export function RequirePermission({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { can, user } = useAuth();
  if (!user) return null;
  return can(perm) ? <>{children}</> : <Forbidden />;
}
