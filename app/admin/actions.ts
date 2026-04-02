"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/supabase/admin-guard";

const roleSchema = z.enum(["admin", "counselor", "student"]);

export async function adminUpdateUserRole(targetUserId: string, role: z.infer<typeof roleSchema>) {
  const id = z.string().uuid().safeParse(targetUserId);
  const roleParse = roleSchema.safeParse(role);
  if (!id.success || !roleParse.success) {
    return { ok: false as const, error: "Invalid input." };
  }

  const { supabase, user } = await requireAdmin();

  const { data: target } = await supabase.from("profiles").select("role").eq("id", id.data).maybeSingle();

  if (!target) return { ok: false as const, error: "User not found." };

  if (target.role === "admin" && roleParse.data !== "admin") {
    const { count, error: cErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (cErr) return { ok: false as const, error: cErr.message };
    if ((count ?? 0) <= 1) {
      return { ok: false as const, error: "Cannot remove the last admin account." };
    }
  }

  if (id.data === user.id && roleParse.data !== "admin") {
    return { ok: false as const, error: "You cannot demote your own admin account here." };
  }

  const { error } = await supabase.from("profiles").update({ role: roleParse.data }).eq("id", id.data);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminSetUserActive(targetUserId: string, isActive: boolean) {
  const id = z.string().uuid().safeParse(targetUserId);
  if (!id.success) return { ok: false as const, error: "Invalid user." };

  const { supabase, user } = await requireAdmin();

  if (id.data === user.id && !isActive) {
    return { ok: false as const, error: "You cannot deactivate your own account." };
  }

  const { data: target } = await supabase.from("profiles").select("role, is_active").eq("id", id.data).maybeSingle();

  if (!target) return { ok: false as const, error: "User not found." };

  if (target.role === "admin" && !isActive) {
    const { count, error: cErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);

    if (cErr) return { ok: false as const, error: cErr.message };
    if ((count ?? 0) <= 1) {
      return { ok: false as const, error: "Cannot deactivate the last active admin." };
    }
  }

  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id.data);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export type AppointmentPdfRow = {
  scheduled_at: string;
  status: string;
  concern_type: string;
  student_name: string;
  counselor_name: string;
};

export async function fetchAppointmentsForPdf(fromIso: string, toIso: string) {
  const from = z.string().min(1).safeParse(fromIso);
  const to = z.string().min(1).safeParse(toIso);
  if (!from.success || !to.success) {
    return { ok: false as const, error: "Invalid date range." as const };
  }

  const { supabase } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("scheduled_at, status, concern_type, student_id, counselor_id")
    .gte("scheduled_at", from.data)
    .lte("scheduled_at", to.data)
    .order("scheduled_at", { ascending: true });

  if (error) return { ok: false as const, error: error.message };

  const list = rows ?? [];
  const ids = [...new Set(list.flatMap((r) => [r.student_id, r.counselor_id]))];
  const { data: profiles } =
    ids.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string }[] };

  const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  const out: AppointmentPdfRow[] = list.map((r) => ({
    scheduled_at: r.scheduled_at,
    status: r.status,
    concern_type: r.concern_type,
    student_name: nameMap[r.student_id] ?? "—",
    counselor_name: nameMap[r.counselor_id] ?? "—",
  }));

  return { ok: true as const, rows: out };
}
