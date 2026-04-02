"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hourlySlotDates, localDayBounds } from "@/lib/appointment-slots";
import { logAction } from "@/lib/audit";
import { createServerClient } from "@/lib/supabase";

const counselorStatusSchema = z.enum(["confirmed", "cancelled", "completed"]);

/**
 * Lists ISO timestamps still available for booking (pending/confirmed appointments subtracted).
 */
export async function getAvailableSlots(
  counselorId: string,
  date: string,
): Promise<{ ok: true; slots: string[] } | { ok: false; error: string }> {
  const idParse = z.string().uuid().safeParse(counselorId);
  const dateParse = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
  if (!idParse.success || !dateParse.success) {
    return { ok: false, error: "Invalid counselor or date." };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "student" || profile.is_active === false) {
      return { ok: false, error: "Only active students can view availability." };
    }

    const bounds = localDayBounds(dateParse.data);
    if ("error" in bounds) return { ok: false, error: bounds.error };

    const { data: booked, error: bookedErr } = await supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("counselor_id", idParse.data)
      .gte("scheduled_at", bounds.start.toISOString())
      .lte("scheduled_at", bounds.end.toISOString())
      .in("status", ["pending", "confirmed"]);

    if (bookedErr) {
      return { ok: false, error: bookedErr.message };
    }

    const taken = new Set(
      (booked ?? []).map((r) => {
        const t = new Date(r.scheduled_at).getTime();
        return Math.floor(t / 60000);
      }),
    );

    const slotDates = hourlySlotDates(bounds.start);
    const slots = slotDates
      .filter((dt) => !taken.has(Math.floor(dt.getTime() / 60000)))
      .map((dt) => dt.toISOString());

    return { ok: true, slots };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load slots.";
    return { ok: false, error: msg };
  }
}

const bookSchema = z.object({
  counselorId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  concernType: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookSchema>;

/**
 * Books a slot after re-validating it is still free (same request, race minimized).
 */
export async function bookAppointment(
  raw: BookAppointmentInput,
): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid booking details." };
  }

  try {
    const scheduled = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) {
      return { ok: false, error: "Invalid date or time." };
    }
    if (scheduled.getTime() < Date.now()) {
      return { ok: false, error: "Please choose a future date and time." };
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

    if (me?.role !== "student" || me.is_active === false) {
      return { ok: false, error: "Only active students can book." };
    }

    const { data: counselor, error: counselorError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", parsed.data.counselorId)
      .eq("role", "counselor")
      .maybeSingle();

    if (counselorError || !counselor) {
      return { ok: false, error: "That counselor is not available." };
    }

    const minuteKey = Math.floor(scheduled.getTime() / 60000);
    const windowStart = new Date(minuteKey * 60000).toISOString();
    const windowEnd = new Date(minuteKey * 60000 + 60000).toISOString();

    const { data: clash, error: clashErr } = await supabase
      .from("appointments")
      .select("id")
      .eq("counselor_id", parsed.data.counselorId)
      .gte("scheduled_at", windowStart)
      .lt("scheduled_at", windowEnd)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    if (clashErr) return { ok: false, error: clashErr.message };
    if (clash) return { ok: false, error: "That time was just taken. Pick another slot." };

    const { data: inserted, error: insertErr } = await supabase
      .from("appointments")
      .insert({
        student_id: user.id,
        counselor_id: parsed.data.counselorId,
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

    await logAction("APPOINTMENT_CREATED", {
      counselorId: parsed.data.counselorId,
      scheduledAt: scheduled.toISOString(),
      table_name: "appointments",
      record_id: inserted.id,
    });

    revalidatePath("/appointments");
    revalidatePath("/student");
    return { ok: true, appointmentId: inserted.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Booking failed.";
    return { ok: false, error: msg };
  }
}

/**
 * Counselor-only status transitions for appointments assigned to the caller.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: z.infer<typeof counselorStatusSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const idParse = z.string().uuid().safeParse(appointmentId);
  const stParse = counselorStatusSchema.safeParse(status);
  if (!idParse.success || !stParse.success) {
    return { ok: false, error: "Invalid request." };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "counselor" || profile.is_active === false) {
      return { ok: false, error: "Only counselors can update appointments." };
    }

    const { data: row, error: fetchError } = await supabase
      .from("appointments")
      .select("id, status")
      .eq("id", idParse.data)
      .eq("counselor_id", user.id)
      .maybeSingle();

    if (fetchError || !row) return { ok: false, error: "Appointment not found." };

    const cur = row.status as string;
    const next = stParse.data;

    if (cur === "cancelled" || cur === "completed") {
      return { ok: false, error: "This appointment cannot be updated." };
    }
    if (next === "confirmed" && cur !== "pending") {
      return { ok: false, error: "Only pending appointments can be confirmed." };
    }
    if (next === "completed" && cur === "pending") {
      return { ok: false, error: "Confirm the appointment before marking completed." };
    }
    if (next === "cancelled" && (cur === "completed" || cur === "cancelled")) {
      return { ok: false, error: "Invalid status change." };
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status: next })
      .eq("id", idParse.data)
      .eq("counselor_id", user.id);

    if (error) return { ok: false, error: error.message };

    await logAction("APPOINTMENT_STATUS_UPDATED", {
      appointmentId: idParse.data,
      status: next,
      table_name: "appointments",
      record_id: idParse.data,
    });

    revalidatePath("/counselor");
    revalidatePath("/student");
    revalidatePath("/appointments");
    revalidatePath(`/counselor/case-notes/${idParse.data}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    return { ok: false, error: msg };
  }
}

export async function cancelStudentAppointment(
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = z.string().uuid().safeParse(appointmentId);
  if (!id.success) {
    return { ok: false, error: "Invalid appointment." };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: row, error: fetchError } = await supabase
      .from("appointments")
      .select("id, status")
      .eq("id", id.data)
      .eq("student_id", user.id)
      .maybeSingle();

    if (fetchError || !row) {
      return { ok: false, error: "Appointment not found." };
    }

    if (row.status === "cancelled" || row.status === "completed") {
      return { ok: false, error: "This appointment can no longer be cancelled." };
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id.data)
      .eq("student_id", user.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await logAction("APPOINTMENT_CANCELLED_STUDENT", {
      table_name: "appointments",
      record_id: id.data,
    });

    revalidatePath("/appointments");
    revalidatePath("/student");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not cancel.";
    return { ok: false, error: msg };
  }
}
