import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/ui-kit";
import { authApi } from "@/lib/api/services";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Lala Salama" },
      { name: "description", content: "Request a password reset link for your Lala Salama account." },
      { property: "og:title", content: "Forgot password — Lala Salama" },
      { property: "og:description", content: "Reset your Lala Salama password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold">Reset your password</h1>
        {sent ? (
          <p className="mt-3 text-sm text-muted-foreground">If an account exists for that address, a reset link has been sent. The link expires in 30 minutes.</p>
        ) : (
          <form noValidate className="mt-4 space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            if (!z.string().email().safeParse(email.trim()).success) { setErr("Enter a valid email address"); return; }
            await authApi.forgotPassword(email.trim()); setSent(true);
          }}>
            <div>
              <label htmlFor="em" className="mb-1.5 block text-xs text-muted-foreground">Email address</label>
              <input id="em" type="email" className="field" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} aria-invalid={!!err} />
              {err && <p className="mt-1 text-[11px] text-destructive">{err}</p>}
            </div>
            <Button type="submit" className="w-full">Send reset link</Button>
          </form>
        )}
        <div className="mt-5 flex justify-between text-sm">
          <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
          <Link to="/reset-password" className="text-muted-foreground hover:underline">I have a reset link</Link>
        </div>
      </div>
    </div>
  );
}
