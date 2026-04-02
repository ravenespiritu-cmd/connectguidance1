import { redirect } from "next/navigation";

import { isAppRole, ROLE_HOME } from "@/lib/auth/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireReceptionist() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/receptionist");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "receptionist" || profile.is_active === false) {
    const r = profile?.role && isAppRole(profile.role) ? profile.role : null;
    redirect(r ? ROLE_HOME[r] : "/login");
  }

  return { supabase, user };
}
