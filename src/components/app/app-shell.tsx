import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, KeyRound, LogOut, Menu, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { useNotifications } from "@/lib/api/hooks";
import { USING_MOCK_API } from "@/lib/api/http";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "./ui-kit";
import { ACCOUNT_PATH, MOBILE_TABS, NAV, type Area } from "./nav";

function useUnread() {
  const { user } = useAuth();
  const { data } = useNotifications();
  return (data ?? []).filter((n) => user && !n.readBy.includes(user.id)).length;
}

function NavList({ area, onNavigate }: { area: Area; onNavigate?: () => void }) {
  const { can } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Main" className="space-y-5">
      {NAV[area].map((g, i) => {
        const items = g.items.filter((it) => !it.perm || can(it.perm));
        if (!items.length) return null;
        return (
          <div key={i}>
            {g.label && <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">{g.label}</p>}
            <ul className="space-y-0.5">
              {items.map((it) => {
                const active = path === it.to || (it.to.split("/").length > 3 ? false : path.startsWith(`${it.to}/`) && !items.some((o) => o !== it && path.startsWith(o.to) && o.to.length > it.to.length));
                return (
                  <li key={it.to}>
                    <Link to={it.to as never} onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                      <it.icon className="size-4 shrink-0" aria-hidden />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({ area, children }: { area: Area; children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const unread = useUnread();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");

  const doLogout = async () => { await logout(); navigate({ to: "/login", replace: true }); };
  const notifPath = `/${area}/notifications`;
  const searchTarget = area === "resident" ? null : `/${area}/residents`;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden>
        <div className="absolute -left-16 -top-24 size-72 rounded-full bg-primary/25 blur-3xl animate-drift" />
        <div className="absolute -right-20 top-1/3 size-80 rounded-full bg-accent/20 blur-3xl animate-drift-slow" />
        <div className="absolute bottom-0 left-1/4 size-72 rounded-full bg-info/15 blur-3xl" />
      </div>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-sidebar backdrop-blur-xl lg:flex no-print">
        <div className="border-b border-border p-4"><Logo /></div>
        <div className="flex-1 overflow-y-auto p-3"><NavList area={area} /></div>
        <div className="border-t border-border p-3 text-[10px] text-subtle">
          {USING_MOCK_API ? "Demo mode · mock API (sample data)" : "Connected to API"}
        </div>
      </aside>

      <div className="relative z-10 lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/70 backdrop-blur-xl no-print">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <div className="lg:hidden"><Logo compact /></div>
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="text-[13px] font-semibold leading-tight tracking-wide">LALA SALAMA</p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">Hostel Security &amp; Management</p>
            </div>
            {searchTarget && (
              <form className="hidden flex-1 lg:block" role="search"
                onSubmit={(e) => { e.preventDefault(); navigate({ to: searchTarget as never, search: { q } as never }); }}>
                <label className="relative block max-w-md">
                  <span className="sr-only">Search residents</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                  <input className="field pl-9" placeholder="Search residents, rooms…" value={q} onChange={(e) => setQ(e.target.value)} />
                </label>
              </form>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Link to={notifPath as never} aria-label={`Notifications, ${unread} unread`}
                className="relative grid size-10 place-items-center rounded-lg bg-secondary ring-1 ring-border hover:bg-secondary/80">
                <Bell className="size-4" aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">{unread}</span>
                )}
              </Link>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="grid size-10 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">{initials(user?.fullName ?? "?")}</div>
                <div className="hidden leading-tight xl:block">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{user && ROLE_LABEL[user.role]}</p>
                </div>
              </div>
              <Link to={ACCOUNT_PATH[area] as never} aria-label="Account & password" className="hidden size-10 place-items-center rounded-lg hover:bg-secondary sm:grid">
                <KeyRound className="size-4" aria-hidden />
              </Link>
              <button onClick={doLogout} aria-label="Log out" className="hidden size-10 place-items-center rounded-lg hover:bg-secondary sm:grid">
                <LogOut className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Quick" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 gap-1 rounded-xl bg-surface/90 p-1.5 ring-1 ring-border backdrop-blur-md lg:hidden no-print">
        {MOBILE_TABS[area].map((t) => {
          const active = path === t.to;
          return (
            <Link key={t.to} to={t.to as never} className={cn("flex flex-col items-center gap-1 rounded-lg py-2 text-[10px]", active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground")}>
              <t.icon className="size-4" aria-hidden />{t.label}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] text-muted-foreground" aria-label="Open menu">
          <Menu className="size-4" aria-hidden />Menu
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 overflow-y-auto bg-surface p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-4"><Logo /></div>
          <div className="mb-4 rounded-lg bg-secondary p-3 text-sm">
            <p className="font-medium">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{user && ROLE_LABEL[user.role]}</p>
          </div>
          <NavList area={area} onNavigate={() => setOpen(false)} />
          <div className="mt-5 space-y-1 border-t border-border pt-4">
            <Link to={ACCOUNT_PATH[area] as never} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              <KeyRound className="size-4" /> Account &amp; password
            </Link>
            <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-secondary">
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
