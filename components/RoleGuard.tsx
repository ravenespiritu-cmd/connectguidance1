import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

type AllowedRole = "admin" | "counselor" | "receptionist" | "student";

type RoleGuardProps = {
  allowed: AllowedRole[];
  fallbackPath?: string;
  children: React.ReactNode;
};

export default async function RoleGuard({
  allowed,
  fallbackPath = "/login",
  children,
}: RoleGuardProps) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowed.includes(profile.role as AllowedRole)) {
    redirect(fallbackPath);
  }

  return <>{children}</>;
}
