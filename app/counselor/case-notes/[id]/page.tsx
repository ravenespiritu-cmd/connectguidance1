import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CounselorCaseNoteForm } from "@/components/CounselorCaseNoteForm";
import { CounselorSubnav } from "@/components/CounselorSubnav";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { LocalDateTimeText } from "@/components/LocalDateTimeText";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decrypt } from "@/lib/encryption";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CounselorCaseNotePage({ params }: PageProps) {
  const { id } = await params;
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  if (profile?.role !== "counselor") {
    redirect(
      profile?.role === "admin"
        ? "/admin"
        : profile?.role === "student"
          ? "/student"
          : profile?.role === "receptionist"
            ? "/receptionist"
            : "/login",
    );
  }

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, concern_type, notes, student_id")
    .eq("id", idParsed.data)
    .eq("counselor_id", user.id)
    .maybeSingle();

  if (apptError || !appt) notFound();

  const { data: student } = await supabase
    .from("profiles")
    .select("full_name, student_id, department")
    .eq("id", appt.student_id)
    .maybeSingle();

  const { data: note } = await supabase
    .from("case_notes")
    .select("content, is_confidential, updated_at")
    .eq("appointment_id", idParsed.data)
    .eq("counselor_id", user.id)
    .maybeSingle();

  let initialContent = "";
  if (note?.content) {
    try {
      initialContent = decrypt(note.content);
    } catch {
      initialContent =
        "[Could not decrypt this note. Ensure ENCRYPTION_KEY (64 hex chars) matches the key used when the note was saved.]";
    }
  }

  const formKey = note?.updated_at ?? "new";

  const userLabel = profile?.full_name ?? user.email ?? null;

  return (
    <div className="bg-muted/20 min-h-full flex-1">
      <CounselorSubnav userLabel={userLabel} />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/counselor" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2 inline-flex")}>
              ← Schedule
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Case note</h1>
            <p className="text-muted-foreground text-sm">
              <LocalDateTimeText iso={appt.scheduled_at} pattern="EEEE, MMM d, yyyy · h:mm a" />
            </p>
          </div>
          <AppointmentStatusBadge status={appt.status} />
        </div>

        <Card className="border-teal-600/15">
          <CardHeader>
            <CardTitle className="text-base">Student summary</CardTitle>
            <CardDescription>Visible because this student is assigned to you on this appointment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Name: </span>
              <span className="font-medium">{student?.full_name ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Student ID: </span>
              {student?.student_id ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Department: </span>
              {student?.department ?? "—"}
            </p>
            <p className="pt-2">
              <span className="text-muted-foreground">Concern: </span>
              {appt.concern_type}
            </p>
            {appt.notes ? (
              <p className="text-muted-foreground border-border mt-2 border-t pt-2 italic">Student-submitted note: {appt.notes}</p>
            ) : null}
          </CardContent>
        </Card>

        <CounselorCaseNoteForm
          key={formKey}
          appointmentId={idParsed.data}
          initialContent={initialContent}
          initialConfidential={note?.is_confidential ?? false}
        />
      </div>
    </div>
  );
}
