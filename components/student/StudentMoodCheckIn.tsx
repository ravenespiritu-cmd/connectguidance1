"use client";

import { Loader2, HeartHandshake, Frown, Meh, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { recordStudentMood, type StudentMoodLevel } from "@/actions/student-mood";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shortDisplayName } from "@/lib/short-display-name";

type Props = {
  recentCounselorName: string | null;
};

const moods: { level: StudentMoodLevel; label: string; icon: typeof Smile; sub: string }[] = [
  { level: "good", label: "Good", icon: Smile, sub: "Doing alright" },
  { level: "okay", label: "Okay", icon: Meh, sub: "Mixed or so-so" },
  { level: "low", label: "Not great", icon: Frown, sub: "Having a hard time" },
];

export function StudentMoodCheckIn({ recentCounselorName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<StudentMoodLevel | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  async function submit(level: StudentMoodLevel, withNote?: string) {
    setPending(level);
    const res = await recordStudentMood(level, withNote);
    setPending(null);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    if (res.notified) {
      const who = res.counselorName ? shortDisplayName(res.counselorName) : recentCounselorName ?? "your counselor";
      toast.success(`${who} has been notified. They may reach out when they can.`);
      setShowNote(false);
      setNote("");
    } else {
      toast.success("Thanks for checking in.");
    }
    router.refresh();
  }

  function onPickLow() {
    if (!recentCounselorName) {
      toast.error(
        "Book an appointment first so we know which counselor to notify—or visit the front desk if you need urgent help.",
      );
      return;
    }
    setShowNote(true);
  }

  return (
    <Card className="border-amber-500/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className="bg-amber-500/10 text-amber-800 ring-amber-500/15 dark:text-amber-200 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
            aria-hidden
          >
            <HeartHandshake className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">How are you feeling?</CardTitle>
            <CardDescription>
              A quick check-in. If you’re not doing well, we can let{" "}
              {recentCounselorName ? (
                <span className="text-foreground font-medium">{shortDisplayName(recentCounselorName)}</span>
              ) : (
                "your counselor"
              )}{" "}
              know (from your most recent appointment).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {moods.map(({ level, label, icon: Icon, sub }) => (
            <button
              key={level}
              type="button"
              disabled={pending !== null}
              onClick={() => {
                if (level === "low") {
                  onPickLow();
                } else {
                  void submit(level);
                }
              }}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-auto flex-col gap-1 border-amber-500/20 py-3 px-4 text-left transition-colors hover:bg-amber-500/8",
                level === "low" && "hover:border-amber-600/40 hover:bg-amber-500/12",
              )}
            >
              {pending === level ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Icon className="size-5 opacity-85" aria-hidden />
              )}
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground text-xs font-normal">{sub}</span>
            </button>
          ))}
        </div>

        {showNote && recentCounselorName && (
          <div className="border-border/80 space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Tell {shortDisplayName(recentCounselorName)} anything helpful (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note — only your counselor will see this."
              className={cn(
                "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full min-h-[4.5rem] resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 disabled:opacity-50 dark:bg-input/30",
              )}
              maxLength={500}
              disabled={pending !== null}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending !== null}
                className={cn(buttonVariants({ size: "sm" }), "bg-amber-600 text-white hover:bg-amber-700 gap-2")}
                onClick={() => void submit("low", note)}
              >
                {pending === "low" ? <Loader2 className="size-4 animate-spin" /> : null}
                Send alert
              </button>
              <button
                type="button"
                disabled={pending !== null}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                onClick={() => {
                  setShowNote(false);
                  setNote("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
