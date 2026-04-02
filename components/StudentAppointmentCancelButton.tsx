"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { cancelStudentAppointment } from "@/app/appointments/actions";
import { Button } from "@/components/ui/button";

export function StudentAppointmentCancelButton({
  appointmentId,
  disabled,
}: {
  appointmentId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onCancel() {
    if (!confirm("Cancel this appointment?")) return;
    setLoading(true);
    const res = await cancelStudentAppointment(appointmentId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Appointment cancelled.");
    router.refresh();
  }

  if (disabled) return null;

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
      {loading ? "Cancelling…" : "Cancel"}
    </Button>
  );
}
