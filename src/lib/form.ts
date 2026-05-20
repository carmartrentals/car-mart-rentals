import type { ZodError } from "zod";

/** Shared shape returned by all admin server actions to useActionState. */
export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** Optional payload, e.g. a created record id. */
  data?: Record<string, unknown>;
}

export const initialActionState: ActionState = { ok: false };

/** Convert a ZodError into an ActionState with flattened field errors. */
export function zodErrorState(error: ZodError): ActionState {
  return {
    ok: false,
    error: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/** Coerce a FormData value to a trimmed string. */
export function fd(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Convert empty strings to null for nullable DB columns. */
export function nullable(value: string): string | null {
  return value === "" ? null : value;
}
