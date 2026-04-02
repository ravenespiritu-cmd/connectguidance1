"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveCaseNote } from "@/app/counselor/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type CounselorCaseNoteFormProps = {
  appointmentId: string;
  initialContent: string;
  initialConfidential: boolean;
};

export function CounselorCaseNoteForm({
  appointmentId,
  initialContent,
  initialConfidential,
}: CounselorCaseNoteFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [confidential, setConfidential] = useState(initialConfidential);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Enter note content before saving.");
      return;
    }
    setSubmitting(true);
    const res = await saveCaseNote({
      appointmentId,
      content: content.trim(),
      isConfidential: confidential,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Case note saved (encrypted).");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case note</CardTitle>
        <CardDescription>
          Content is encrypted with AES-256-GCM before storage. Mark confidential to hide this note from the student
          portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">Clinical / session notes</Label>
            <textarea
              id="note-content"
              value={content}
              onChange={(ev) => setContent(ev.target.value)}
              rows={12}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[200px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              placeholder="Summarize the session, follow-ups, and risk indicators..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="confidential"
              checked={confidential}
              onCheckedChange={(v) => setConfidential(v)}
            />
            <Label htmlFor="confidential" className="cursor-pointer font-normal">
              Confidential (student cannot read this note in their history)
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="bg-teal-600 text-white hover:bg-teal-700" disabled={submitting}>
              {submitting ? "Saving…" : "Save encrypted note"}
            </Button>
            <Link href="/counselor" className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
              Back to schedule
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
