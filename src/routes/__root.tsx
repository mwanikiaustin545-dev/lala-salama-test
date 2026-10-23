import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ShieldAlert, ShieldQuestion } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { Logo } from "@/components/app/ui-kit";

function CenterCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md p-8 text-center">{children}</div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <CenterCard>
      <div className="mb-6 flex justify-center"><Logo /></div>
      <ShieldQuestion className="mx-auto size-10 text-info" aria-hidden />
      <p className="mt-4 font-mono text-6xl font-medium">404</p>
      <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This area doesn't exist or has been moved. Check the address or return to your dashboard.</p>
      <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to dashboard</Link>
    </CenterCard>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <CenterCard>
      <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden />
      <p className="mt-4 font-mono text-4xl">500</p>
      <h1 className="mt-2 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. No data was lost. Try again or return home.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Try again</button>
        <a href="/" className="rounded-md px-4 py-2 text-sm ring-1 ring-border hover:bg-secondary">Go home</a>
      </div>
    </CenterCard>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lala Salama — Hostel Security & Management" },
      { name: "description", content: "Centralised hostel security and management: residents, rooms, visitors, access control, incidents, payments and audit logs." },
      { property: "og:title", content: "Lala Salama — Hostel Security & Management" },
      { property: "og:description", content: "Centralised hostel security and management system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
