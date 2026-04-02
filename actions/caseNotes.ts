"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAction } from "@/lib/audit";
import { decrypt, encrypt } from "@/lib/encryption";
import { createServerClient } from "@/lib/supabase";

const createSchema = z.object({
  appointmentId: z.string().uuid(),
  content: z.string().min(1).max(50_000),
  isConfidential: z.boolean(),
});

export async function createCaseNote(
  raw: z.infer<typeof createSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
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
      return { ok: false, error: "Only active counselors can add case notes." };
    }

    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select("id, counselor_id")
      .eq("id", parsed.data.appointmentId)
      .eq("counselor_id", user.id)
      .maybeSingle();

    if (apptError || !appt) {
      return { ok: false, error: "Appointment not found or not assigned to you." };
    }

    let ciphertext: string;
    try {
      ciphertext = encrypt(parsed.data.content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Encryption failed.";
      return { ok: false, error: msg };
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("case_notes")
      .upsert(
        {
          appointment_id: parsed.data.appointmentId,
          counselor_id: user.id,
          content: ciphertext,
          is_confidential: parsed.data.isConfidential,
        },
        { onConflict: "appointment_id,counselor_id" },
      )
      .select("id")
      .single();

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }

    const meta: Record<string, unknown> = {
      appointmentId: parsed.data.appointmentId,
      isConfidential: parsed.data.isConfidential,
      table_name: "case_notes",
    };
    if (upserted?.id) meta.record_id = upserted.id;
    await logAction("CASE_NOTE_UPSERT", meta);

    revalidatePath(`/counselor/case-notes/${parsed.data.appointmentId}`);
    revalidatePath("/counselor");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    return { ok: false, error: msg };
  }
}

const getSchema = z.string().uuid();

export async function getCaseNote(
  caseNoteId: string,
): Promise<{ ok: true; content: string; isConfidential: boolean } | { ok: false; error: string }> {
  const idParse = getSchema.safeParse(caseNoteId);
  if (!idParse.success) {
    return { ok: false, error: "Invalid case note id." };
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

    if (!profile || profile.is_active === false) {
      return { ok: false, error: "Forbidden." };
    }

    const { data: note, error: noteError } = await supabase
      .from("case_notes")
      .select("id, counselor_id, content, is_confidential")
      .eq("id", idParse.data)
      .maybeSingle();

    if (noteError || !note) {
      return { ok: false, error: "Case note not found." };
    }

    const isAuthor = note.counselor_id === user.id;
    const adminNonConfidential = profile.role === "admin" && !note.is_confidential;

    if (!isAuthor && !adminNonConfidential) {
      return { ok: false, error: "You may not view this case note." };
    }

    let plain: string;
    try {
      plain = decrypt(note.content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Decryption failed.";
      return { ok: false, error: msg };
    }

    return { ok: true, content: plain, isConfidential: note.is_confidential };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Load failed.";
    return { ok: false, error: msg };
  }
}
