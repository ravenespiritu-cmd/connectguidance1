import { format } from "date-fns";
import { StickyNote } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decryptCaseNoteContent } from "@/lib/encryption";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type AppointmentEmbed = { scheduled_at: string };

type CaseNoteRow = {
  id: string;
  content: string;
  created_at: string;
  appointments: AppointmentEmbed | AppointmentEmbed[] | null;
};

function appointmentScheduledAt(row: CaseNoteRow): string | undefined {
  const a = row.appointments;
  if (!a) return undefined;
  if (Array.isArray(a)) return a[0]?.scheduled_at;
  return a.scheduled_at;
}

export async function StudentCaseHistory() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("case_notes")
    .select(
      `
      id,
      content,
      created_at,
      appointments (
        scheduled_at
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case notes shared with you</CardTitle>
          <CardDescription className="text-destructive">Could not load notes: {error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const list = (rows ?? []) as CaseNoteRow[];

  if (list.length === 0) {
    return (
      <Card className="border-amber-500/20 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Case notes shared with you</CardTitle>
          <CardDescription>
            When a counselor shares a non-confidential note from a session, it will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-border from-muted/30 to-background rounded-xl border border-dashed bg-gradient-to-b py-10 text-center">
            <div className="bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300 mx-auto flex size-12 items-center justify-center rounded-full ring-1">
              <StickyNote className="size-6" aria-hidden />
            </div>
            <p className="text-muted-foreground mt-4 text-sm font-medium">No notes yet</p>
            <p className="text-muted-foreground/80 mx-auto mt-1 max-w-sm text-xs">
              Shared summaries will appear after your counselor documents a session.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const decrypted = await Promise.all(
    list.map(async (row) => {
      try {
        const text = await decryptCaseNoteContent(row.content);
        return { ...row, plain: text };
      } catch {
        return { ...row, plain: null as string | null };
      }
    }),
  );

  return (
    <Card className="border-amber-500/15">
      <CardHeader>
        <CardTitle>Case notes shared with you</CardTitle>
        <CardDescription>Non-confidential session summaries from your appointments (decrypted on the server).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {decrypted.map((row) => {
          const st = appointmentScheduledAt(row);
          const when = st ? format(new Date(st), "MMM d, yyyy") : "Session";
          return (
            <div key={row.id} className="border-border rounded-lg border p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{when}</p>
              <p className="text-muted-foreground text-xs">
                Recorded {format(new Date(row.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {row.plain ?? "[This note could not be decrypted. Contact support if this persists.]"}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
