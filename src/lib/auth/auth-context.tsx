import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Role, Session, User } from "@/lib/types";
import { clearSession, getSession, setSession, subscribeSession } from "./session";
import { authApi } from "@/lib/api/services";
import { can, type Permission } from "./permissions";

interface AuthCtx {
  user: User | null;
  role: Role | null;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  logout: () => Promise<void>;
  can: (p: Permission) => boolean;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setS] = useState<Session | null>(null);
  const qc = useQueryClient();
  useEffect(() => {
    setS(getSession());
    const off = subscribeSession(() => setS(getSession()));
    // Session expiry watchdog
    const t = setInterval(() => {
      const s = getSession();
      if (!s && window.location.pathname.match(/^\/(admin|security|resident)/)) window.location.assign("/login?expired=1");
    }, 30_000);
    return () => { off(); clearInterval(t); };
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    role: session?.user.role ?? null,
    login: async (email, password, remember) => {
      const r = await authApi.login(email, password);
      setSession({ token: r.token, user: r.user, expiresAt: r.expiresAt }, remember);
      return r.user;
    },
    logout: async () => {
      try { await authApi.logout(); } catch { /* ignore */ }
      await qc.cancelQueries(); qc.clear(); clearSession();
    },
    can: (p) => can(session?.user.role, p),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
