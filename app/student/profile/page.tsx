import { ArrowLeft, Building2, Hash, Mail, UserCircle, BadgeInfo } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StudentSubnav } from "@/components/StudentSubnav";
import { StudentAppBackground } from "@/components/student/StudentAppBackground";
import { StudentChangePasswordForm } from "@/components/student/StudentChangePasswordForm";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function StudentProfilePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, student_id, department, is_active, user_no")
    .eq("id", user.id)
    .single();

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

  const rows = [
    { icon: UserCircle, label: "Full name", value: profile?.full_name ?? "—" },
    {
      icon: BadgeInfo,
      label: "GuidanceConnect user ID",
      value: profile?.user_no != null ? String(profile.user_no) : "—",
    },
    { icon: Mail, label: "Email", value: user.email ?? "—" },
    { icon: Hash, label: "Student ID", value: profile?.student_id?.trim() || "—" },
    { icon: Building2, label: "Department / program", value: profile?.department?.trim() || "—" },
  ] as const;

  return (
    <StudentAppBackground>
      <StudentSubnav userLabel={profile?.full_name ?? user.email ?? null} />
      <div className="relative z-0 mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Your account</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Details from your registration and school records. If something looks wrong, contact your guidance office—they can
              update your file.
            </p>
          </div>
          <Link
            href="/student"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 self-start border-teal-700/25 dark:border-teal-500/30")}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Dashboard
          </Link>
        </div>

        <Card className="border-teal-200/60 shadow-md dark:border-teal-500/20">
          <CardHeader>
            <CardTitle className="text-lg">Student information</CardTitle>
            <CardDescription>What counselors and scheduling use to identify you in GuidanceConnect.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border/60">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="bg-muted/60 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
                  <p className="mt-0.5 text-sm font-medium break-words">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {profile?.is_active !== false ? <StudentChangePasswordForm /> : null}

        {profile?.is_active === false ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive text-base">Account inactive</CardTitle>
              <CardDescription>
                This account has been deactivated. You cannot book appointments until an administrator restores access.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </StudentAppBackground>
  );
}
