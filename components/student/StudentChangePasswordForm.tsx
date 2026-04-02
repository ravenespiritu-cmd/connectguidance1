"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function StudentChangePasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.trim();
      if (!email) {
        toast.error("This sign-in method does not support password changes here.");
        return;
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyErr) {
        toast.error("Current password is incorrect.");
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        toast.error(updateErr.message || "Could not update password.");
        return;
      }

      toast.success("Password updated successfully.");
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  });

  return (
    <Card className="border-amber-200/50 shadow-md dark:border-amber-500/25">
      <CardHeader>
        <CardTitle className="text-lg">Change password</CardTitle>
        <CardDescription>
          For accounts that use email and password. You will stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("currentPassword")}
              />
            </div>
            {errors.currentPassword ? (
              <p className="text-destructive text-sm">{errors.currentPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("newPassword")}
              />
            </div>
            {errors.newPassword ? <p className="text-destructive text-sm">{errors.newPassword.message}</p> : null}
            <p className="text-muted-foreground text-xs">At least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="h-10 pl-9"
                disabled={isSubmitting}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword ? (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
