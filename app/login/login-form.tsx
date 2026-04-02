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
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

type SignInOkPayload = { ok: true; destination: string };
type SignInErrReason = "deactivated" | "no_profile" | "invalid_credentials";
type SignInErrPayload = { ok: false; reason: SignInErrReason };
type SignInPayload = SignInOkPayload | SignInErrPayload;

function isSignInPayload(value: unknown): value is SignInPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as { ok?: unknown; destination?: unknown; reason?: unknown };
  if (v.ok === true) return typeof v.destination === "string";
  if (v.ok === false) {
    return v.reason === "deactivated" || v.reason === "no_profile" || v.reason === "invalid_credentials";
  }
  return false;
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
    let serverDestination: string | undefined;
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payloadUnknown = await res.json().catch(() => null);
      if (!res.ok || !isSignInPayload(payloadUnknown)) {
        toast.error("Sign-in failed. Please try again.");
        return;
      }

      if (payloadUnknown.ok === false) {
        if (payloadUnknown.reason === "deactivated") {
          toast.error("This account has been deactivated.");
          router.replace("/login?error=deactivated");
          return;
        }
        if (payloadUnknown.reason === "no_profile") {
          toast.error("Your account has no profile. Contact an administrator.");
          router.replace("/login?error=no_profile");
          return;
        }
        toast.error("Invalid email or password.");
        return;
      }

      serverDestination = payloadUnknown.destination;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sign in.");
      return;
    }

    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : serverDestination ?? "/";

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
                await fetch("/api/auth/signout", { method: "POST" });
                toast.message("Signed out");
                router.replace("/");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to sign out.");
                router.replace("/");
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
                await fetch("/api/auth/signout", { method: "POST" });
                toast.message("Signed out");
                router.replace("/");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to sign out.");
                router.replace("/");
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
