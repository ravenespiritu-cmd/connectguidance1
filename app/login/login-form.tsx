"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, type AppRole } from "@/lib/auth/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

function isAppRole(value: string | undefined): value is AppRole {
  return value === "admin" || value === "counselor" || value === "student";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Supabase is not configured correctly.");
      return;
    }
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message;
      if (msg === "Invalid API key") {
        toast.error(
          "Supabase rejected the anon key. Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local match the same project (Dashboard → Settings → API), then restart npm run dev.",
        );
      } else {
        toast.error(msg);
      }
      return;
    }

    const userId = signInData.user?.id;
    if (!userId) {
      toast.error("Sign-in succeeded but no user id was returned. Try again.");
      await supabase.auth.signOut();
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile?.role || !isAppRole(profile.role)) {
      toast.error("Your account has no profile. Contact an administrator.");
      await supabase.auth.signOut();
      return;
    }

    if (profile.is_active === false) {
      toast.error("This account has been deactivated.");
      await supabase.auth.signOut();
      return;
    }

    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : ROLE_HOME[profile.role];

    toast.success("Signed in");
    router.refresh();
    router.push(destination);
  });

  return (
    <Card className="w-full border border-teal-200/60 bg-card/85 shadow-lg backdrop-blur-sm dark:border-teal-500/20">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Your information is protected the same way as the rest of GuidanceConnect—enter the email and password for your account.
        </CardDescription>
        {errorParam === "no_profile" ? (
          <p className="text-destructive text-sm">
            No profile is linked to this account. Complete registration or contact an administrator.
          </p>
        ) : null}
        {errorParam === "deactivated" ? (
          <p className="text-destructive text-sm">Your account is deactivated. Contact an administrator if this is a mistake.</p>
        ) : null}
        {errorParam === "auth_callback" ? (
          <p className="text-destructive text-sm">
            Email confirmation or SSO could not be completed. Try signing in again, or request a new confirmation link.
          </p>
        ) : null}
      </CardHeader>
      {errorParam === "deactivated" ? (
        <div className="border-border bg-muted/50 mx-6 mb-0 rounded-md border px-3 py-2 text-sm">
          <p className="text-muted-foreground">Sign out is required before signing in with another account.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={async () => {
              try {
                const supabase = getSupabaseBrowserClient();
                await supabase.auth.signOut();
                toast.message("Signed out");
                router.replace("/login");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Supabase is not configured correctly.");
              }
            }}
          >
            Sign out
          </Button>
        </div>
      ) : null}
      {errorParam === "no_profile" ? (
        <div className="border-border bg-muted/50 mx-6 mb-0 rounded-md border px-3 py-2 text-sm">
          <p className="text-muted-foreground">You are signed in but your profile is missing. Sign out to use a different account, or contact an administrator.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={async () => {
              try {
                const supabase = getSupabaseBrowserClient();
                await supabase.auth.signOut();
                toast.message("Signed out");
                router.replace("/login");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Supabase is not configured correctly.");
              }
            }}
          >
            Sign out
          </Button>
        </div>
      ) : null}
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5 pt-2 pb-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("email")}
              />
            </div>
            {errors.email ? <p className="text-destructive text-sm">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("password")}
              />
            </div>
            {errors.password ? <p className="text-destructive text-sm">{errors.password.message}</p> : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:gap-3">
            <Button
              type="submit"
              className="h-10 w-full bg-teal-700 text-white shadow-sm hover:bg-teal-800 sm:flex-1 dark:bg-teal-600 dark:hover:bg-teal-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex h-10 min-h-10 w-full items-center justify-center border-teal-700/25 sm:flex-1 dark:border-teal-500/30",
              )}
            >
              Create student account
            </Link>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
