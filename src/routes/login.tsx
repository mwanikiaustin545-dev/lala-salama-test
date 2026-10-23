import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/ui-kit";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_HOME } from "@/lib/auth/permissions";
import { loginSchema } from "@/lib/validation";
import { DEMO_ACCOUNTS } from "@/lib/mock/seed";
import { USING_MOCK_API, ApiError } from "@/lib/api/http";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ expired: s.expired ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — Lala Salama Hostel Security" },
      { name: "description", content: "Secure sign-in for Lala Salama hostel administrators, security officers and residents." },
      { property: "og:title", content: "Sign in — Lala Salama" },
      { property: "og:description", content: "Secure sign-in for the Lala Salama hostel system." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { expired } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState(expired ? "Your session expired. Please sign in again." : "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const r = loginSchema.safeParse({ email, password, remember });
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({}); setBusy(true);
    try {
      const u = await login(email, password, remember);
      navigate({ to: ROLE_HOME[u.role], replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError || err instanceof Error ? err.message : "Sign-in failed");
      setPassword("");
    } finally { setBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 -top-24 size-80 rounded-full bg-primary/25 blur-3xl animate-drift" />
        <div className="absolute -right-20 top-1/3 size-96 rounded-full bg-accent/20 blur-3xl animate-drift-slow" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="glass p-6 sm:p-8">
          <Logo />
          <h1 className="mt-6 text-xl font-semibold">Sign in to your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authorised users only.</p>
          {formError && <div role="alert" className="mt-4 rounded-lg bg-destructive/15 p-3 text-sm text-destructive ring-1 ring-destructive/30">{formError}</div>}
          <form noValidate onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">Email or username</label>
              <input id="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
              {errors.email && <p id="email-err" className="mt-1 text-[11px] text-destructive">{errors.email}</p>}
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="field pr-10" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] text-destructive">{errors.password}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me on this device
            </label>
            <Button type="submit" className="h-10 w-full" disabled={busy}><Lock /> {busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          <div className="mt-5 flex gap-2 rounded-lg bg-secondary p-3 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
            <p>Security notice: all activity is logged and monitored. Accounts lock after repeated failed attempts. Never share your password.</p>
          </div>
        </div>
        {USING_MOCK_API && (
          <div className="glass mt-4 p-4">
            <p className="mb-2 text-xs font-semibold">Demo accounts <span className="font-normal text-muted-foreground">(sample data — click to fill)</span></p>
            <ul className="grid gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button type="button" onClick={() => { setEmail(a.email); setPassword(a.password); }} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary">
                    <span className="font-medium">{a.role}</span><span className="font-mono text-muted-foreground">{a.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
