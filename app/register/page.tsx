import { RegisterForm } from "@/app/register/register-form";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Create your student account"
      description="Use your official name, student ID, and school email so your counselor can match you to the right records. New sign-ups are students by default; staff accounts are set up by your program."
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
