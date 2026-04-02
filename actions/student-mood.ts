"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAction } from "@/lib/audit";
import { createServerClient } from "@/lib/supabase";

const moodSchema = z.enum(["good", "okay", "low"]);
const noteSchema = z.string().max(500).optional();

export type StudentMoodLevel = z.infer<typeof moodSchema>;

export async function recordStudentMood(
  mood: StudentMoodLevel,
  note?: string | null,
): Promise<
  | { ok: true; notified: boolean; counselorName?: string }
  | { ok: false; error: string }
> {
  const m = moodSchema.safeParse(mood);
  const n = noteSchema.safeParse(note?.trim() ? note.trim() : undefined);
  if (!m.success || !n.success) {
    return { ok: false, error: "Invalid check-in." };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: me } = await supabase
      .from("profiles")
      .select("role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role !== "student" || me.is_active === false) {
      return { ok: false, error: "Only active students can check in." };
    }

    if (m.data !== "low") {
      await logAction("STUDENT_MOOD_CHECKIN", {
        mood: m.data,
        table_name: "application",
      });
      return { ok: true, notified: false };
    }

    const { data: lastAppt, error: apptErr } = await supabase
      .from("appointments")
      .select("counselor_id")
      .eq("student_id", user.id)
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (apptErr || !lastAppt?.counselor_id) {
      return {
        ok: false,
        error:
          "We could not find a counselor from your appointments yet. Book a session first, or reach the front desk if you need help right away.",
      };
    }

    const { data: counselor, error: cErr } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", lastAppt.counselor_id)
      .eq("role", "counselor")
      .maybeSingle();

    if (cErr || !counselor) {
      return { ok: false, error: "That counselor is no longer available. Please contact support." };
    }

    const { data: inserted, error: insErr } = await supabase
      .from("student_mood_alerts")
      .insert({
        student_id: user.id,
        counselor_id: counselor.id,
        note: n.data ?? null,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return { ok: false, error: insErr?.message ?? "Could not send alert." };
    }

    await logAction("STUDENT_MOOD_ALERT", {
      mood: "low",
      counselorId: counselor.id,
      table_name: "student_mood_alerts",
      record_id: inserted.id,
    });

    revalidatePath("/student");
    revalidatePath("/counselor");
    return {
      ok: true,
      notified: true,
      counselorName: counselor.full_name ?? undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Check-in failed.";
    return { ok: false, error: msg };
  }
}
