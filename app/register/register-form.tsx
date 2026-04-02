"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Hash, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Programs shown on student registration; value stored on profile metadata. */
const DEPARTMENT_PROGRAMS = [
  "Accountancy Program",
  "Arts & Science Program",
  "Business Administration Program",
  "Criminal Justice Education Program",
  "Computer Studies Program",
  "Engineering Technology Program",
  "Nursing Program",
  "Teachers Education Program",
  "Tourism & Hospitality Management Program",
] as const;

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Full name is required"),
  student_id: z.string().min(1, "Student ID is required"),
  department: z
    .string()
    .min(1, "Select department")
    .refine(
      (v): v is (typeof DEPARTMENT_PROGRAMS)[number] =>
        (DEPARTMENT_PROGRAMS as readonly string[]).includes(v),
      { message: "Select department" },
    ),
});

type FormValues = z.input<typeof schema>;

type SignUpOkPayload = { ok: true; message: string; hasSession: boolean };
type SignUpErrPayload = { ok: false; message: string };
type SignUpPayload = SignUpOkPayload | SignUpErrPayload;

function isSignUpPayload(value: unknown): value is SignUpPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as { ok?: unknown; message?: unknown; hasSession?: unknown };
  if (v.ok === true) {
    return typeof v.message === "string" && typeof v.hasSession === "boolean";
  }
  if (v.ok === false) {
    return typeof v.message === "string";
  }
  return false;
}

export function RegisterForm() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      student_id: "",
      department: "",
    },
  });

  const onSubmit = handleSubmit(
    async ({ email, password, full_name, student_id, department }) => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name, student_id, department }),
        });

        const payloadUnknown = await res.json().catch(() => null);
        if (!res.ok || !isSignUpPayload(payloadUnknown)) {
          toast.error("Sign up failed. Please try again.");
          return;
        }

        if (payloadUnknown.ok === false) {
          const msg = payloadUnknown.message;
          if (msg === "Invalid API key") {
            toast.error(
              "Supabase rejected the anon key. Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local match the same project, then restart npm run dev.",
            );
          } else {
            toast.error(msg);
          }
          return;
        }

        if (payloadUnknown.hasSession) {
          toast.success(payloadUnknown.message ?? "Welcome! Your student account is ready.");
          router.refresh();
          router.push("/student");
          return;
        }

        toast.message(payloadUnknown.message ?? "Confirm your email, then sign in.");
        router.push("/login");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to sign up.");
      }
    },
  );

  return (
    <Card className="w-full border border-teal-200/60 bg-card/85 shadow-lg backdrop-blur-sm dark:border-teal-500/20">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-xl">Your details</CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          New accounts are students by default. Counselors and admins are added by your institution—if you are staff, ask your
          program lead instead of registering here.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <div className="relative">
              <User className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
              <Input
                id="full_name"
                autoComplete="name"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("full_name")}
              />
            </div>
            {errors.full_name ? <p className="text-destructive text-sm">{errors.full_name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="student_id">Student ID</Label>
            <div className="relative">
              <Hash className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
              <Input
                id="student_id"
                autoComplete="off"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("student_id")}
              />
            </div>
            {errors.student_id ? <p className="text-destructive text-sm">{errors.student_id.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department or program</Label>
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <Building2
                    className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="department" className="h-10 w-full min-w-0 pl-9" size="default">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_PROGRAMS.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            {errors.department ? <p className="text-destructive text-sm">{errors.department.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">School email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="new-password"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("password")}
              />
            </div>
            {errors.password ? <p className="text-destructive text-sm">{errors.password.message}</p> : null}
            <p className="text-muted-foreground text-xs leading-relaxed">At least 8 characters. Choose something only you know.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-between">
          <Button
            type="submit"
            className="h-10 w-full bg-teal-700 text-white shadow-sm hover:bg-teal-800 sm:w-auto dark:bg-teal-600 dark:hover:bg-teal-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex h-10 w-full items-center justify-center border-teal-700/25 sm:w-auto dark:border-teal-500/30",
            )}
          >
            I already have an account
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
