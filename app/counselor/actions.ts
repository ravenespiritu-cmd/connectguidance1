"use server";

import { updateAppointmentStatus } from "@/actions/appointments";

export type CounselorAppointmentNextStatus = "confirmed" | "cancelled" | "completed";

export async function updateCounselorAppointmentStatus(
  appointmentId: string,
  nextStatus: CounselorAppointmentNextStatus,
) {
  return updateAppointmentStatus(appointmentId, nextStatus);
}
