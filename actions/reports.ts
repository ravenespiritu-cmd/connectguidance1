"use server";

import { z } from "zod";

import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const filtersSchema = z.object({
  department: z.string().optional(),
  concern_type: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
});

export type ReportFilters = z.infer<typeof filtersSchema>;

export type ReportAppointmentRow = {
  id: string;
  scheduled_at: string;
  status: string;
  concern_type: string;
  student_name: string;
  student_department: string | null;
  counselor_name: string;
  counselor_department: string | null;
};

const rangeSchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
});

/**
 * Admin-only aggregated appointments with student/counselor profile labels.
 */
export async function generateReport(
  dateFrom: string,
  dateTo: string,
  filters: ReportFilters,
): Promise<{ ok: true; rows: ReportAppointmentRow[] } | { ok: false; error: string }> {
  try {
    const range = rangeSchema.safeParse({ dateFrom, dateTo });
    const filt = filtersSchema.safeParse(filters);
    if (!range.success || !filt.success) {
      return { ok: false, error: "Invalid report filters or date range." };
    }

    const { supabase } = await requireAdmin();

    let query = supabase
      .from("appointments")
      .select("id, scheduled_at, status, concern_type, student_id, counselor_id")
      .gte("scheduled_at", range.data.dateFrom)
      .lte("scheduled_at", range.data.dateTo)
      .order("scheduled_at", { ascending: true });

    if (filt.data.status) {
      query = query.eq("status", filt.data.status);
    }
    if (filt.data.concern_type?.trim()) {
      query = query.eq("concern_type", filt.data.concern_type.trim());
    }

    const { data: rows, error } = await query;
    if (error) {
      return { ok: false, error: error.message };
    }

    const list = rows ?? [];
    const ids = [...new Set(list.flatMap((r) => [r.student_id, r.counselor_id]))];
    const { data: profiles, error: pErr } =
      ids.length > 0
        ? await supabase.from("profiles").select("id, full_name, department").in("id", ids)
        : { data: [] as { id: string; full_name: string; department: string | null }[], error: null };

    if (pErr) {
      return { ok: false, error: pErr.message };
    }

    const pmap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    let out: ReportAppointmentRow[] = list.map((r) => ({
      id: r.id,
      scheduled_at: r.scheduled_at,
      status: r.status,
      concern_type: r.concern_type,
      student_name: pmap[r.student_id]?.full_name ?? "—",
      student_department: pmap[r.student_id]?.department ?? null,
      counselor_name: pmap[r.counselor_id]?.full_name ?? "—",
      counselor_department: pmap[r.counselor_id]?.department ?? null,
    }));

    const deptQ = filt.data.department?.trim().toLowerCase();
    if (deptQ) {
      out = out.filter((r) => (r.student_department ?? "").toLowerCase().includes(deptQ));
    }

    return { ok: true, rows: out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Report failed.";
    return { ok: false, error: msg };
  }
}

/** Audit hook after a PDF export from the admin UI (never throws). */
export async function logReportExport(dateFrom: string, dateTo: string, filters: ReportFilters): Promise<void> {
  const filt = filtersSchema.safeParse(filters);
  await logAction("REPORT_EXPORT", {
    dateFrom,
    dateTo,
    filters: filt.success ? filt.data : filters,
    table_name: "appointments",
  });
}
