"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hourlySlotDates, localDayBounds } from "@/lib/appointment-slots";
import { logAction } from "@/lib/audit";
import { createServerClient } from "@/lib/supabase";

const searchSchema = z.string().trim().min(2).max(120);

export type ReceptionStudentSearchRow = {
  id: string;
  full_name: string;
  student_id: string | null;
  user_no: number | null;
};

export type ReceptionCounselorRow = {
  id: string;
  full_name: string;
};

/**
 * Active counselors for front-desk booking (alphabetical), receptionist only.
 */
export async function listReceptionCounselors(): Promise<
  { ok: true; counselors: ReceptionCounselorRow[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: me } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role !== "receptionist" || me.is_active === false) {
      return { ok: false, error: "Only reception staff can load counselors." };
    }

    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "counselor")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) return { ok: false, error: error.message };

    return { ok: true, counselors: (rows ?? []) as ReceptionCounselorRow[] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load counselors.";
    return { ok: false, error: msg };
  }
}

/**
 * Active student search for front-desk booking (receptionist only).
 */
export async function searchStudentsForReception(
  rawQuery: string,
): Promise<{ ok: true; students: ReceptionStudentSearchRow[] } | { ok: false; error: string }> {
  const qParse = searchSchema.safeParse(rawQuery);
  if (!qParse.success) {
    return { ok: true, students: [] };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: me } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role !== "receptionist" || me.is_active === false) {
      return { ok: false, error: "Only reception staff can search students." };
    }

    const q = qParse.data.replace(/,/g, " ").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const like = `%${q}%`;

    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, full_name, student_id, user_no")
      .eq("role", "student")
      .eq("is_active", true)
      .or(`full_name.ilike.${like},student_id.ilike.${like}`)
      .order("full_name", { ascending: true })
      .limit(25);

    if (error) return { ok: false, error: error.message };

    return { ok: true, students: (rows ?? []) as ReceptionStudentSearchRow[] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Search failed.";
    return { ok: false, error: msg };
  }
}

/**
 * Times (local) on a day when at least one counselor has an open hourly slot.
 * When `specificCounselorId` is set, only that counselor's free hours are returned.
 */
export async function getReceptionBookableTimeSlots(
  dateYmd: string,
  specificCounselorId?: string | null,
): Promise<{ ok: true; slots: string[] } | { ok: false; error: string }> {
  const dateParse = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(dateYmd);
  if (!dateParse.success) {
    return { ok: false, error: "Invalid date." };
  }

  const counselorPick =
    specificCounselorId && String(specificCounselorId).trim().length > 0
      ? z.string().uuid().safeParse(String(specificCounselorId).trim())
      : null;
  if (counselorPick && !counselorPick.success) {
    return { ok: false, error: "Invalid counselor." };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: me } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role !== "receptionist" || me.is_active === false) {
      return { ok: false, error: "Only reception staff can load availability." };
    }

    const bounds = localDayBounds(dateParse.data);
    if ("error" in bounds) return { ok: false, error: bounds.error };

    const [{ data: counselors }, { data: booked }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .eq("role", "counselor")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("appointments")
        .select("counselor_id, scheduled_at")
        .gte("scheduled_at", bounds.start.toISOString())
        .lte("scheduled_at", bounds.end.toISOString())
        .in("status", ["pending", "confirmed"]),
    ]);

    let counselorIds = (counselors ?? []).map((c) => c.id);
    if (counselorIds.length === 0) {
      return { ok: true, slots: [] };
    }

    if (counselorPick?.success) {
      if (!counselorIds.includes(counselorPick.data)) {
        return { ok: true, slots: [] };
      }
      counselorIds = [counselorPick.data];
    }

    const taken = new Set(
      (booked ?? []).map((r) => `${r.counselor_id}:${Math.floor(new Date(r.scheduled_at).getTime() / 60000)}`),
    );

    const slotDates = hourlySlotDates(bounds.start);
    const slots: string[] = [];
    for (const dt of slotDates) {
      const minute = Math.floor(dt.getTime() / 60000);
      const anyFree = counselorIds.some((cid) => !taken.has(`${cid}:${minute}`));
      if (anyFree) {
        slots.push(
          `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
        );
      }
    }

    return { ok: true, slots };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load slots.";
    return { ok: false, error: msg };
  }
}

const bookForStudentSchema = z.object({
  studentId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  concernType: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  counselorId: z.string().uuid().optional(),
});

export type ReceptionistBookForStudentInput = z.infer<typeof bookForStudentSchema>;

/**
 * Books a counselor for the slot: optional `counselorId` picks that person if free;
 * otherwise the first available counselor (alphabetical) is assigned.
 */
export async function receptionistBookAppointmentForStudent(
  raw: ReceptionistBookForStudentInput,
): Promise<
  | { ok: true; appointmentId: string; counselorId: string; counselorName: string }
  | { ok: false; error: string }
> {
  const parsed = bookForStudentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid booking details." };
  }

  try {
    const scheduled = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) {
      return { ok: false, error: "Invalid date or time." };
    }
    if (scheduled.getTime() < Date.now()) {
      return { ok: false, error: "Choose a future date and time." };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: me } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role !== "receptionist" || me.is_active === false) {
      return { ok: false, error: "Only reception staff can book for students." };
    }

    const { data: student, error: studentErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", parsed.data.studentId)
      .eq("role", "student")
      .eq("is_active", true)
      .maybeSingle();

    if (studentErr || !student) {
      return { ok: false, error: "Student not found or inactive." };
    }

    const { data: counselors, error: couErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "counselor")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (couErr || !counselors?.length) {
      return { ok: false, error: "No active counselors are available." };
    }

    const minuteKey = Math.floor(scheduled.getTime() / 60000);
    const windowStart = new Date(minuteKey * 60000).toISOString();
    const windowEnd = new Date(minuteKey * 60000 + 60000).toISOString();

    const requestedId = parsed.data.counselorId?.trim();

    let chosenCounselorId: string | null = null;

    if (requestedId) {
      const inRoster = counselors.some((c) => c.id === requestedId);
      if (!inRoster) {
        return { ok: false, error: "That counselor is not available for booking." };
      }
      const { data: clash } = await supabase
        .from("appointments")
        .select("id")
        .eq("counselor_id", requestedId)
        .gte("scheduled_at", windowStart)
        .lt("scheduled_at", windowEnd)
        .in("status", ["pending", "confirmed"])
        .maybeSingle();

      if (clash) {
        return { ok: false, error: "That counselor already has an appointment at this time—choose another time or counselor." };
      }
      chosenCounselorId = requestedId;
    } else {
      for (const c of counselors) {
        const { data: clash } = await supabase
          .from("appointments")
          .select("id")
          .eq("counselor_id", c.id)
          .gte("scheduled_at", windowStart)
          .lt("scheduled_at", windowEnd)
          .in("status", ["pending", "confirmed"])
          .maybeSingle();

        if (!clash) {
          chosenCounselorId = c.id;
          break;
        }
      }
    }

    if (!chosenCounselorId) {
      return { ok: false, error: "No counselor is free at that time—pick another slot." };
    }

    const { data: counselorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", chosenCounselorId)
      .maybeSingle();

    const counselorName = counselorProfile?.full_name?.trim() || "Counselor";

    const { data: inserted, error: insertErr } = await supabase
      .from("appointments")
      .insert({
        student_id: parsed.data.studentId,
        counselor_id: chosenCounselorId,
        scheduled_at: scheduled.toISOString(),
        concern_type: parsed.data.concernType,
        notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return { ok: false, error: insertErr?.message ?? "Could not save appointment." };
    }

    await logAction("APPOINTMENT_CREATED_RECEPTION", {
      studentId: parsed.data.studentId,
      counselorId: chosenCounselorId,
      scheduledAt: scheduled.toISOString(),
      table_name: "appointments",
      record_id: inserted.id,
    });

    revalidatePath("/receptionist");
    revalidatePath("/appointments");
    revalidatePath("/student");
    revalidatePath("/counselor");
    return { ok: true, appointmentId: inserted.id, counselorId: chosenCounselorId, counselorName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Booking failed.";
    return { ok: false, error: msg };
  }
}
