"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateCounselorAppointmentStatus } from "@/app/counselor/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Status = "pending" | "confirmed" | "cancelled" | "completed";

function CaseNoteButton({ appointmentId, className }: { appointmentId: string; className?: string }) {
  return (
    <Link
      href={`/counselor/case-notes/${appointmentId}`}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "inline-flex items-center justify-center gap-1.5 border-teal-600/35 bg-background/80 hover:bg-teal-500/10 dark:border-teal-500/40 sm:justify-start",
        className,
      )}
      title="Open encrypted case note for this session"
    >
      <FileText className="size-3.5 shrink-0 opacity-85" aria-hidden />
      Case note
    </Link>
  );
}

export function CounselorAppointmentActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: Status;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: "confirmed" | "cancelled" | "completed", label: string) {
    setLoading(label);
    const res = await updateCounselorAppointmentStatus(appointmentId, action);
    setLoading(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Appointment updated.");
    router.refresh();
  }

  if (status === "cancelled" || status === "completed") {
    return <CaseNoteButton appointmentId={appointmentId} />;
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5">
      <div className="flex max-w-full flex-wrap gap-1.5">
        {status === "pending" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={loading !== null}
              onClick={() => run("confirmed", "confirm")}
            >
              {loading === "confirm" ? "…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => run("cancelled", "cancel")}
            >
              {loading === "cancel" ? "…" : "Cancel"}
            </Button>
          </>
        ) : null}
        {status === "confirmed" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={loading !== null}
              onClick={() => run("completed", "complete")}
              title="Mark this session as completed"
            >
              {loading === "complete" ? "…" : "Mark completed"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => run("cancelled", "cancel")}
            >
              {loading === "cancel" ? "…" : "Cancel"}
            </Button>
          </>
        ) : null}
      </div>
      <CaseNoteButton appointmentId={appointmentId} className="self-stretch sm:self-start" />
    </div>
  );
}
