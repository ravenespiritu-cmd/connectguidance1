import { MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import ChatbotWidget from "@/components/ChatbotWidget";
import { StudentSubnav } from "@/components/StudentSubnav";
import { StudentAppBackground } from "@/components/student/StudentAppBackground";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ChatbotPage() {
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
        <div className="border-amber-500/20 from-amber-500/10 via-background relative overflow-hidden rounded-2xl border bg-gradient-to-br to-teal-950/5 px-6 py-8 sm:px-8 dark:to-teal-950/20">
          <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-amber-400/15 blur-2xl dark:bg-amber-500/20" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                <Sparkles className="size-3.5" aria-hidden />
                Guidance assistant
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Quick answers, human care when it counts</h1>
              <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                Ask about academics, wellness, or campus resources. The assistant can suggest ideas—it does not replace a
                conversation with your counselor when you need personal support.
              </p>
            </div>
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 border-teal-700/25 dark:border-teal-500/30",
              )}
              href="/student"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-teal-200/50 shadow-sm dark:border-teal-500/20">
            <CardHeader className="pb-2">
              <div className="bg-teal-500/10 text-teal-800 dark:text-teal-200 mb-2 flex size-10 items-center justify-center rounded-xl">
                <MessageCircle className="size-5" aria-hidden />
              </div>
              <CardTitle className="text-base">Open the chat</CardTitle>
              <CardDescription>
                Use the amber <strong className="font-medium text-foreground">Guidance assistant</strong> button at the
                bottom-right. It opens the full streaming experience and keeps your thread for this session.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stay grounded</CardTitle>
              <CardDescription>
                If you are struggling or in crisis, reach your campus counseling center or emergency services—this tool is for
                everyday questions, not emergencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground pt-0 text-xs leading-relaxed">
              Prefer a real person? Head to <Link href="/appointments" className="text-amber-700 underline underline-offset-2 dark:text-amber-400">Appointments</Link>{" "}
              to book time with someone from your guidance office.
            </CardContent>
          </Card>
        </div>
      </div>
      <ChatbotWidget studentId={user.id} />
    </StudentAppBackground>
  );
}
