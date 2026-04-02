"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { encryptCaseNoteContent } from "@/lib/encryption";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["confirmed", "cancelled", "completed"]);

export async function updateCounselorAppointmentStatus(appointmentId: string, nextStatus: z.infer<typeof statusSchema>) {
  const idParse = z.string().uuid().safeParse(appointmentId);
  const statusParse = statusSchema.safeParse(nextStatus);
  if (!idParse.success || !statusParse.success) {
    return { ok: false as const, error: "Invalid request." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const { data: row, error: fetchError } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", idParse.data)
    .eq("counselor_id", user.id)
    .maybeSingle();

  if (fetchError || !row) return { ok: false as const, error: "Appointment not found." };

  const cur = row.status as string;
  const next = statusParse.data;

  if (cur === "cancelled" || cur === "completed") {
    return { ok: false as const, error: "This appointment cannot be updated." };
  }
  if (next === "confirmed" && cur !== "pending") {
    return { ok: false as const, error: "Only pending appointments can be confirmed." };
  }
  if (next === "cancelled" && (cur === "completed" || cur === "cancelled")) {
    return { ok: false as const, error: "Invalid status change." };
  }
  if (next === "completed" && cur === "pending") {
    return { ok: false as const, error: "Confirm the appointment before marking completed." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: next })
    .eq("id", idParse.data)
    .eq("counselor_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/counselor");
  revalidatePath("/student");
  revalidatePath("/appointments");
  revalidatePath(`/counselor/case-notes/${idParse.data}`);
  return { ok: true as const };
}

export async function saveCaseNote(input: {
  appointmentId: string;
  content: string;
  isConfidential: boolean;
}) {
  const schema = z.object({
    appointmentId: z.string().uuid(),
    content: z.string().min(1, "Note cannot be empty").max(50_000),
    isConfidential: z.boolean(),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized." };

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, counselor_id")
    .eq("id", parsed.data.appointmentId)
    .eq("counselor_id", user.id)
    .maybeSingle();

  if (apptError || !appt) {
    return { ok: false as const, error: "Appointment not found or not assigned to you." };
  }

  let encrypted: string;
  try {
    encrypted = await encryptCaseNoteContent(parsed.data.content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption failed.";
    return { ok: false as const, error: msg };
  }

  const { error: upsertError } = await supabase.from("case_notes").upsert(
    {
      appointment_id: parsed.data.appointmentId,
      counselor_id: user.id,
      content: encrypted,
      is_confidential: parsed.data.isConfidential,
    },
    { onConflict: "appointment_id,counselor_id" },
  );

  if (upsertError) return { ok: false as const, error: upsertError.message };

  revalidatePath(`/counselor/case-notes/${parsed.data.appointmentId}`);
  revalidatePath("/counselor");
  return { ok: true as const };
}
