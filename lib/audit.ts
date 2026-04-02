import { getSupabaseServerClient } from "@/lib/supabase/server";

type AuditPayload = {
  action: string;
  table_name: string;
  record_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAction(payload: AuditPayload) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: payload.action,
    table_name: payload.table_name,
    record_id: payload.record_id ?? null,
    metadata: payload.metadata ?? {},
  });
}
