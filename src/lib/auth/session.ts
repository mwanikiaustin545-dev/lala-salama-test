import type { Session } from "@/lib/types";

// Session persistence. "Remember me" uses localStorage, otherwise
// sessionStorage (cleared when the browser closes). In production prefer an
// HttpOnly refresh cookie + short-lived in-memory access token.
const KEY = "lalasalama.session";
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    if (s.expiresAt < Date.now()) { clearSession(); return null; }
    return s;
  } catch { return null; }
}
export function setSession(s: Session, remember: boolean) {
  clearSession(false);
  (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
  listeners.forEach((l) => l());
}
export function clearSession(emit = true) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
  if (emit) listeners.forEach((l) => l());
}
export function subscribeSession(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
