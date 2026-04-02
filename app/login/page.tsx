import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Sign in to continue"
      description="Access your dashboard with the email and password your campus provided—or the ones you used when you registered. Counselors and administrators use the same calm sign-in."
    >
      <Suspense fallback={<div className="text-muted-foreground rounded-2xl border border-dashed py-12 text-center text-sm">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
