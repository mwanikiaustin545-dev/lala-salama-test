import { useEffect, useState, type ReactNode } from "react";
import type { ZodTypeAny } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";

export interface Field {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "datetime-local" | "time" | "textarea" | "select" | "password" | "checkbox";
  options?: (string | { value: string; label: string })[];
  placeholder?: string;
  full?: boolean;
  help?: string;
}

export function FormFields({ fields, values, errors, onChange }: {
  fields: Field[]; values: Record<string, unknown>; errors: Record<string, string>; onChange: (n: string, v: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `f-${f.name}`;
        const err = errors[f.name];
        const common = {
          id, name: f.name, "aria-invalid": !!err, "aria-describedby": err ? `${id}-err` : undefined,
        };
        const v = values[f.name];
        return (
          <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
            {f.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...common} checked={!!v} onChange={(e) => onChange(f.name, e.target.checked)} className="size-4 accent-primary" />
                {f.label}
              </label>
            ) : (
              <>
                <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea {...common} rows={4} className="field h-auto py-2" placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)} />
                ) : f.type === "select" ? (
                  <select {...common} className="field" value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)}>
                    <option value="" disabled>Select…</option>
                    {f.options?.map((o) => {
                      const ov = typeof o === "string" ? { value: o, label: o } : o;
                      return <option key={ov.value} value={ov.value}>{ov.label}</option>;
                    })}
                  </select>
                ) : (
                  <input {...common} type={f.type ?? "text"} className="field" placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)} />
                )}
              </>
            )}
            {f.help && !err && <p className="mt-1 text-[11px] text-subtle">{f.help}</p>}
            {err && <p id={`${id}-err`} className="mt-1 text-[11px] text-destructive">{err}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Validates with zod client-side, then calls onSubmit; maps server 400 details back onto fields. */
export function useZodForm(schema: ZodTypeAny, initial: Record<string, unknown>) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const onChange = (n: string, v: unknown) => { setValues((s) => ({ ...s, [n]: v })); setErrors((e) => ({ ...e, [n]: "" })); };
  const submit = async (fn: (data: Record<string, unknown>) => Promise<unknown>) => {
    const r = schema.safeParse(values);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => { const k = String(i.path[0] ?? "form"); e[k] ??= i.message; });
      setErrors(e);
      return false;
    }
    setBusy(true);
    try { await fn(r.data); return true; }
    catch (err) { if (err instanceof ApiError && err.details) setErrors(err.details); return false; }
    finally { setBusy(false); }
  };
  return { values, setValues, errors, onChange, submit, busy, reset: () => { setValues(initial); setErrors({}); } };
}

export function FormDialog({ open, onOpenChange, title, description, schema, fields, initial, onSubmit, submitLabel = "Save", children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; schema: ZodTypeAny; fields: Field[];
  initial: Record<string, unknown>; onSubmit: (data: Record<string, unknown>) => Promise<unknown>; submitLabel?: string; children?: ReactNode;
}) {
  const form = useZodForm(schema, initial);
  useEffect(() => { if (open) { form.setValues(initial); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form noValidate onSubmit={async (e) => { e.preventDefault(); if (await form.submit(onSubmit)) onOpenChange(false); }} className="space-y-5">
          {children}
          <FormFields fields={fields} values={form.values} errors={form.errors} onChange={form.onChange} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.busy}>{form.busy ? "Saving…" : submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
