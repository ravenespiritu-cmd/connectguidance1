"use client";

import { format } from "date-fns";
import { CalendarIcon, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { bookAppointment } from "@/app/appointments/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONCERN_TYPES } from "@/lib/concerns";
import { generateDayTimeSlots } from "@/lib/time-slots";
import { cn } from "@/lib/utils";

export type CounselorOption = {
  id: string;
  full_name: string;
  department: string | null;
};

type BookAppointmentFormProps = {
  counselors: CounselorOption[];
};

export function BookAppointmentForm({ counselors }: BookAppointmentFormProps) {
  const router = useRouter();
  const [counselorId, setCounselorId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [concernType, setConcernType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = useMemo(() => generateDayTimeSlots(), []);

  const scheduledAtIso = useMemo(() => {
    if (!date || !timeSlot) return null;
    const [hh, mm] = timeSlot.split(":").map(Number);
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }, [date, timeSlot]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!counselorId || !scheduledAtIso || !concernType) {
      toast.error("Choose a counselor, date, time, and concern type.");
      return;
    }

    setSubmitting(true);
    const res = await bookAppointment({
      counselorId,
      scheduledAtIso,
      concernType:
        concernType === "other"
          ? notes.trim()
            ? `Other: ${notes.trim()}`
            : "Other"
          : CONCERN_TYPES.find((c) => c.value === concernType)?.label ?? concernType,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success("Appointment requested.");
    setCounselorId("");
    setDate(undefined);
    setTimeSlot("");
    setConcernType("");
    setNotes("");
    router.refresh();
  }

  if (counselors.length === 0) {
    return (
      <div className="border-border from-muted/40 to-background rounded-xl border border-dashed bg-gradient-to-b py-10 text-center">
        <div className="bg-teal-500/10 text-teal-800 ring-teal-500/20 dark:text-teal-200 mx-auto flex size-12 items-center justify-center rounded-full ring-1">
          <Users className="size-6" aria-hidden />
        </div>
        <p className="mt-4 text-sm font-medium">No counselors available yet</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
          Check back soon or visit your guidance office. Counselor profiles are added by an administrator at your school.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Counselor</Label>
        <Select value={counselorId} onValueChange={(v) => setCounselorId(v ?? "")}>
          <SelectTrigger className="w-full min-w-0" size="default">
            <SelectValue placeholder="Select a counselor" />
          </SelectTrigger>
          <SelectContent>
            {counselors.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
                {c.department ? ` · ${c.department}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 w-full justify-start font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Select value={timeSlot} onValueChange={(v) => setTimeSlot(v ?? "")}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Select a time slot" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((t) => (
                <SelectItem key={t} value={t}>
                  {format(new Date(`2000-01-01T${t}:00`), "h:mm a")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Concern type</Label>
        <Select value={concernType} onValueChange={(v) => setConcernType(v ?? "")}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="What would you like to discuss?" />
          </SelectTrigger>
          <SelectContent>
            {CONCERN_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes for counselor (optional)</Label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          placeholder="Anything you would like your counselor to know in advance…"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-24 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button type="submit" className="bg-amber-600 text-white hover:bg-amber-700" disabled={submitting}>
        {submitting ? "Booking…" : "Book appointment"}
      </Button>
    </form>
  );
}
