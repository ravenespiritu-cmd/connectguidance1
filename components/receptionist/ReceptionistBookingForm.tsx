"use client";

import { format } from "date-fns";
import { CalendarIcon, UserSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getReceptionBookableTimeSlots,
  listReceptionCounselors,
  receptionistBookAppointmentForStudent,
  searchStudentsForReception,
  type ReceptionCounselorRow,
  type ReceptionStudentSearchRow,
} from "@/actions/receptionist";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

const AUTO_COUNSELOR = "__auto__";

export function ReceptionistBookingForm() {
  const router = useRouter();
  const [studentQuery, setStudentQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ReceptionStudentSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ReceptionStudentSearchRow | null>(null);

  const [counselors, setCounselors] = useState<ReceptionCounselorRow[]>([]);
  const [counselorsLoading, setCounselorsLoading] = useState(true);
  const [counselorSelection, setCounselorSelection] = useState<string>(AUTO_COUNSELOR);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState("");
  const [bookableHm, setBookableHm] = useState<Set<string> | null>(null);
  const [concernType, setConcernType] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = useMemo(() => {
    const out: string[] = [];
    for (let h = 9; h < 17; h++) {
      out.push(`${String(h).padStart(2, "0")}:00`);
    }
    return out;
  }, []);

  /** Base UI Select shows the raw `value` in the trigger unless `items` maps value → label. */
  const counselorItems = useMemo(() => {
    const m: Record<string, string> = {
      [AUTO_COUNSELOR]: "Next available (alphabetical by name)",
    };
    for (const c of counselors) {
      m[c.id] = c.full_name;
    }
    return m;
  }, [counselors]);

  const scheduledAtIso = useMemo(() => {
    if (!selectedStudent || !date || !timeSlot) return null;
    const [hh, mm] = timeSlot.split(":").map(Number);
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }, [date, selectedStudent, timeSlot]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCounselorsLoading(true);
      const res = await listReceptionCounselors();
      if (cancelled) return;
      setCounselorsLoading(false);
      if (!res.ok) {
        toast.error(res.error);
        setCounselors([]);
        return;
      }
      setCounselors(res.counselors);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = studentQuery.trim();
    if (q.length < 2) {
      startTransition(() => setSearchResults([]));
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        const res = await searchStudentsForReception(q);
        setSearchLoading(false);
        if (!res.ok) {
          toast.error(res.error);
          setSearchResults([]);
          return;
        }
        setSearchResults(res.students);
      })();
    }, 320);
    return () => window.clearTimeout(t);
  }, [studentQuery]);

  useEffect(() => {
    if (!date) {
      startTransition(() => setBookableHm(null));
      return;
    }
    const ymd = format(date, "yyyy-MM-dd");
    const forCounselorId = counselorSelection === AUTO_COUNSELOR ? null : counselorSelection;
    let cancelled = false;
    void (async () => {
      const res = await getReceptionBookableTimeSlots(ymd, forCounselorId);
      if (cancelled) return;
      if (!res.ok) {
        startTransition(() => setBookableHm(null));
        toast.error(res.error);
        return;
      }
      startTransition(() => setBookableHm(new Set(res.slots)));
    })();
    return () => {
      cancelled = true;
    };
  }, [date, counselorSelection]);

  const visibleTimeSlots = useMemo(() => {
    if (!bookableHm) return timeSlots;
    return timeSlots.filter((t) => bookableHm.has(t));
  }, [bookableHm, timeSlots]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !scheduledAtIso || !concernType) {
      toast.error("Select a student, date, time, and concern type.");
      return;
    }

    const concernLabel =
      concernType === "other"
        ? notes.trim()
          ? `Other: ${notes.trim()}`
          : "Other"
        : CONCERN_TYPES.find((c) => c.value === concernType)?.label ?? concernType;

    setSubmitting(true);
    const res = await receptionistBookAppointmentForStudent({
      studentId: selectedStudent.id,
      scheduledAt: scheduledAtIso,
      concernType: concernLabel,
      notes: notes.trim() || undefined,
      counselorId: counselorSelection === AUTO_COUNSELOR ? undefined : counselorSelection,
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success(`Booked with ${res.counselorName}.`);
    setStudentQuery("");
    setSearchResults([]);
    setSelectedStudent(null);
    setDate(undefined);
    setTimeSlot("");
    setCounselorSelection(AUTO_COUNSELOR);
    setConcernType("");
    setNotes("");
    setBookableHm(null);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="student-search">Student</Label>
        <div className="relative">
          <UserSearch className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
          <Input
            id="student-search"
            value={studentQuery}
            onChange={(ev) => {
              setStudentQuery(ev.target.value);
              if (selectedStudent) setSelectedStudent(null);
            }}
            placeholder="Search name or student ID…"
            className="h-10 pl-9"
            disabled={!!selectedStudent}
            autoComplete="off"
          />
        </div>
        {selectedStudent ? (
          <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{selectedStudent.full_name}</span>
              {selectedStudent.user_no != null ? (
                <span className="text-muted-foreground"> · #{selectedStudent.user_no}</span>
              ) : null}
              {selectedStudent.student_id ? (
                <span className="text-muted-foreground"> · {selectedStudent.student_id}</span>
              ) : null}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-violet-700 dark:text-violet-300"
              onClick={() => {
                setSelectedStudent(null);
                setStudentQuery("");
                setSearchResults([]);
                setCounselorSelection(AUTO_COUNSELOR);
                setDate(undefined);
                setTimeSlot("");
                setBookableHm(null);
              }}
            >
              Change
            </Button>
          </div>
        ) : studentQuery.trim().length >= 2 ? (
          <div className="border-border max-h-48 overflow-auto rounded-lg border bg-card text-sm shadow-sm">
            {searchLoading ? (
              <p className="text-muted-foreground p-3 text-xs">Searching…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-muted-foreground p-3 text-xs">No matching active students.</p>
            ) : (
              <ul className="divide-border divide-y">
                {searchResults.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="hover:bg-muted/80 w-full px-3 py-2.5 text-left transition-colors"
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentQuery(
                          `${s.full_name}${s.user_no != null ? ` #${s.user_no}` : ""}${s.student_id ? ` (${s.student_id})` : ""}`,
                        );
                        setSearchResults([]);
                      }}
                    >
                      <span className="font-medium">{s.full_name}</span>
                      {s.user_no != null ? (
                        <span className="text-muted-foreground tabular-nums"> · #{s.user_no}</span>
                      ) : null}
                      {s.student_id ? (
                        <span className="text-muted-foreground"> · {s.student_id}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">Type at least two characters to search.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Counselor</Label>
        <Select
          value={counselorSelection}
          onValueChange={(v) => {
            setCounselorSelection(v ?? AUTO_COUNSELOR);
            setTimeSlot("");
          }}
          items={counselorItems}
          disabled={!selectedStudent || counselorsLoading || counselors.length === 0}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder={counselorsLoading ? "Loading counselors…" : "Choose how to assign"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO_COUNSELOR} label="Next available">
              Next available (alphabetical by name)
            </SelectItem>
            {counselors.map((c) => (
              <SelectItem key={c.id} value={c.id} label={c.full_name}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {counselorSelection === AUTO_COUNSELOR
            ? "Time list shows any hour where at least one counselor is free. Booking assigns the first free counselor by name."
            : "Time list shows only hours when the selected counselor has no pending or confirmed appointment. Dates and times are 9:00 a.m.–4:00 p.m."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger
              type="button"
              disabled={!selectedStudent || counselors.length === 0}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 w-full justify-start font-normal",
                !date && "text-muted-foreground",
                (!selectedStudent || counselors.length === 0) && "pointer-events-none opacity-50",
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setTimeSlot("");
                }}
                disabled={(d) =>
                  d < new Date(new Date().setHours(0, 0, 0, 0)) || !selectedStudent || counselors.length === 0
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Select
            value={timeSlot}
            onValueChange={(v) => setTimeSlot(v ?? "")}
            disabled={!selectedStudent || !date}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue
                placeholder={
                  counselorSelection === AUTO_COUNSELOR
                    ? "Select a time (any free counselor)"
                    : "Select a time when this counselor is free"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {visibleTimeSlots.length === 0 ? (
                <div className="text-muted-foreground p-2 text-sm">
                  {counselorSelection === AUTO_COUNSELOR
                    ? "No counselors have an open slot this day."
                    : "This counselor has no open slots this day."}
                </div>
              ) : (
                visibleTimeSlots.map((t) => (
                  <SelectItem key={t} value={t}>
                    {format(new Date(`2000-01-01T${t}:00`), "h:mm a")}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Concern type</Label>
        <Select
          value={concernType}
          onValueChange={(v) => setConcernType(v ?? "")}
          disabled={!selectedStudent}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="What is the student hoping to discuss?" />
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
        <Label htmlFor="recv-notes">Notes for counselor (optional)</Label>
        <textarea
          id="recv-notes"
          rows={3}
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          placeholder="Visit context, preferences, or other non-clinical notes…"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-24 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-violet-700 text-white hover:bg-violet-800 sm:w-auto dark:bg-violet-600 dark:hover:bg-violet-500"
        disabled={submitting || !selectedStudent || counselors.length === 0}
      >
        {submitting
          ? "Booking…"
          : counselorSelection === AUTO_COUNSELOR
            ? "Book next available counselor"
            : `Book with ${counselors.find((c) => c.id === counselorSelection)?.full_name ?? "counselor"}`}
      </Button>
    </form>
  );
}
