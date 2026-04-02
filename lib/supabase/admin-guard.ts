import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, full_name, user_no")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    redirect("/login");
  }

  return { supabase, user, profile };
}
