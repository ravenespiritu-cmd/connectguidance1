"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateCounselorAppointmentStatus } from "@/app/counselor/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Status = "pending" | "confirmed" | "cancelled" | "completed";

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
    return (
      <Link
        href={`/counselor/case-notes/${appointmentId}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
      >
        Case note
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <Link
        href={`/counselor/case-notes/${appointmentId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex")}
      >
        Case note
      </Link>
    </div>
  );
}
