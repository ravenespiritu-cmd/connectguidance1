"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const bookSchema = z.object({
  counselorId: z.string().uuid(),
  scheduledAtIso: z.string().min(1),
  concernType: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
});

export async function bookAppointment(raw: z.infer<typeof bookSchema>) {
  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid booking details." };
  }

  const scheduled = new Date(parsed.data.scheduledAtIso);
  if (Number.isNaN(scheduled.getTime())) {
    return { ok: false as const, error: "Invalid date or time." };
  }

  if (scheduled.getTime() < Date.now()) {
    return { ok: false as const, error: "Please choose a future date and time." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const { data: counselor, error: counselorError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.counselorId)
    .eq("role", "counselor")
    .maybeSingle();

  if (counselorError || !counselor) {
    return { ok: false as const, error: "That counselor is not available." };
  }

  const { error } = await supabase.from("appointments").insert({
    student_id: user.id,
    counselor_id: parsed.data.counselorId,
    scheduled_at: scheduled.toISOString(),
    concern_type: parsed.data.concernType,
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    status: "pending",
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/appointments");
  revalidatePath("/student");
  return { ok: true as const };
}

export async function cancelStudentAppointment(appointmentId: string) {
  const id = z.string().uuid().safeParse(appointmentId);
  if (!id.success) {
    return { ok: false as const, error: "Invalid appointment." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const { data: row, error: fetchError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", id.data)
    .eq("student_id", user.id)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false as const, error: "Appointment not found." };
  }

  if (row.status === "cancelled" || row.status === "completed") {
    return { ok: false as const, error: "This appointment can no longer be cancelled." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id.data)
    .eq("student_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/appointments");
  revalidatePath("/student");
  return { ok: true as const };
}
