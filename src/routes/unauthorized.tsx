import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { Logo } from "@/components/app/ui-kit";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Unauthorized — Lala Salama" },
      { name: "description", content: "You do not have permission to access this area." },
      { property: "og:title", content: "Unauthorized — Lala Salama" },
      { property: "og:description", content: "Access restricted." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md p-8 text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <ShieldX className="mx-auto size-10 text-destructive" aria-hidden />
        <p className="mt-4 font-mono text-5xl">403</p>
        <h1 className="mt-2 text-lg font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role doesn't have access to that area. If you believe this is a mistake, contact the hostel administrator.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to my dashboard</Link>
      </div>
    </div>
  ),
});
