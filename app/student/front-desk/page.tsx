import Link from "next/link";
import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { StudentSubnav } from "@/components/StudentSubnav";
import { StudentAppBackground } from "@/components/student/StudentAppBackground";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function StudentFrontDeskPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  if (profile?.role !== "student") {
    redirect(
      profile?.role === "admin"
        ? "/admin"
        : profile?.role === "counselor"
          ? "/counselor"
          : profile?.role === "receptionist"
            ? "/receptionist"
            : "/login",
    );
  }

  return (
    <StudentAppBackground>
      <StudentSubnav userLabel={profile?.full_name ?? user.email ?? null} />
      <div className="relative z-0 mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div className="border-amber-500/15 from-amber-500/8 via-background rounded-2xl border bg-gradient-to-br to-transparent px-6 py-8 sm:px-8">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">In person</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Visit the reception desk</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Prefer to talk to someone in person? Stop by your guidance office. Reception staff can look you up and book the next
            available counselor for a time that works—your appointment will appear here and under Appointments as soon as it is
            saved.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/appointments"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500",
              )}
            >
              View my appointments
            </Link>
            <Link
              href="/student"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-amber-700/25 dark:border-amber-500/30",
              )}
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="bg-amber-500/15 text-amber-800 ring-amber-500/20 dark:text-amber-200 flex size-10 shrink-0 items-center justify-center rounded-full ring-1">
                <Building2 className="size-5" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-lg">What to bring</CardTitle>
                <CardDescription className="mt-1 leading-relaxed">
                  Your school email or student ID helps staff find your account quickly. If you do not have a GuidanceConnect profile
                  yet, they may direct you to register first.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm leading-relaxed">
            <p>
              You can still book yourself through{" "}
              <Link href="/appointments" className="font-medium text-amber-800 underline-offset-4 hover:underline dark:text-amber-300">
                Appointments
              </Link>{" "}
              anytime; the front desk is simply another way to get on the calendar.
            </p>
          </CardContent>
        </Card>
      </div>
    </StudentAppBackground>
  );
}
