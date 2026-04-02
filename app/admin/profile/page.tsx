import { ArrowLeft, BadgeInfo, Mail, Shield, UserCircle } from "lucide-react";
import Link from "next/link";

import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { StudentChangePasswordForm } from "@/components/student/StudentChangePasswordForm";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { cn } from "@/lib/utils";

export default async function AdminProfilePage() {
  const { user, profile } = await requireAdmin();

  const rows = [
    { icon: UserCircle, label: "Full name", value: profile.full_name ?? "—" },
    {
      icon: BadgeInfo,
      label: "GuidanceConnect user ID",
      value: profile.user_no != null ? String(profile.user_no) : "—",
    },
    { icon: Mail, label: "Email", value: user.email ?? "—" },
    { icon: Shield, label: "Role", value: profile.role ?? "—" },
  ] as const;

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav userLabel={profile.full_name} />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Your account</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Administrator account details. Other admins manage staff roles from Users.
            </p>
          </div>
          <Link
            href="/admin"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2 self-start border-blue-500/25 dark:border-blue-400/30",
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Overview
          </Link>
        </div>

        <Card className="border-blue-200/60 shadow-md dark:border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-lg">Administrator</CardTitle>
            <CardDescription>Identity shown in audit logs and session.</CardDescription>
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
                This account has been deactivated. Another administrator must restore access before you can use the console.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
