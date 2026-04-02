import { createServerClient } from "@/lib/supabase";

/**
 * Application-level audit entry. Swallows all errors so business logic never fails because logging failed.
 */
export async function logAction(action: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const tableName =
      metadata && typeof metadata.table_name === "string" ? metadata.table_name : "application";
    const recordIdRaw = metadata?.record_id;
    const recordId =
      typeof recordIdRaw === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        recordIdRaw,
      )
        ? recordIdRaw
        : null;

    const meta: Record<string, unknown> = { ...(metadata ?? {}) };
    delete meta.table_name;
    delete meta.record_id;

    const { error } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      action,
      table_name: tableName,
      record_id: recordId,
      metadata: meta,
    });
    if (error) {
      /* RLS/network — never surface to callers */
    }
  } catch {
    /* intentionally silent */
  }
}
