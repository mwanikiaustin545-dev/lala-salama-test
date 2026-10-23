import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/ui-kit";
import { FormFields, useZodForm } from "@/components/app/form-dialog";
import { passwordSchema } from "@/lib/validation";
import { authApi } from "@/lib/api/services";

const schema = z.object({ password: passwordSchema, confirm: z.string() }).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Lala Salama" },
      { name: "description", content: "Choose a new secure password for your Lala Salama account." },
      { property: "og:title", content: "Set a new password — Lala Salama" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const form = useZodForm(schema, { password: "", confirm: "" });
  const [done, setDone] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold">Set a new password</h1>
        {done ? (
          <p className="mt-3 text-sm text-muted-foreground">Password updated. You can now sign in with your new password.</p>
        ) : (
          <form noValidate className="mt-4 space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            // Reset token is read from the URL fragment (never the query string) so it isn't logged by servers.
            const token = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
            if (await form.submit((d) => authApi.resetPassword(token, String(d.password)))) setDone(true);
          }}>
            <FormFields values={form.values} errors={form.errors} onChange={form.onChange} fields={[
              { name: "password", label: "New password", type: "password", full: true, help: "10+ characters with upper, lower, number and symbol" },
              { name: "confirm", label: "Confirm password", type: "password", full: true },
            ]} />
            <Button type="submit" className="w-full" disabled={form.busy}>Update password</Button>
          </form>
        )}
        <Link to="/login" className="mt-5 inline-block text-sm text-primary hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
