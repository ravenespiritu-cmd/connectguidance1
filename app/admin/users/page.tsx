import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { AdminUserRow, type AdminUserRowData } from "@/components/admin/AdminUserRow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { cn } from "@/lib/utils";

const filterSelectClassName = cn(
  "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-sm text-card-foreground shadow-sm outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  /* Native option list inherits OS colors; align with page theme so text is not light-on-white in dark mode */
  "[color-scheme:light] dark:[color-scheme:dark]",
);

type SearchParams = {
  q?: string;
  role?: string;
  active?: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireAdmin();

  const roleSchema = z.enum(["admin", "counselor", "receptionist", "student"]);
  const roleParse = sp.role ? roleSchema.safeParse(sp.role) : { success: false as const, data: undefined };
  const role = roleParse.success ? roleParse.data : null;

  const activeRaw = sp.active?.trim().toLowerCase();
  const active =
    activeRaw === "true" ? (true as const) : activeRaw === "false" ? (false as const) : null;

  const q = sp.q?.trim() ?? "";

  let query = supabase
    .from("profiles")
    .select("id, user_no, full_name, student_id, department, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    const like = `%${q.replace(/%/g, "\\%")}%`;
    const orParts = [
      `full_name.ilike.${like}`,
      `student_id.ilike.${like}`,
      `department.ilike.${like}`,
    ];
    if (/^\d+$/.test(q)) {
      orParts.push(`user_no.eq.${q}`);
    }
    query = query.or(orParts.join(","));
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (active !== null) {
    query = query.eq("is_active", active);
  }

  const { data: rows, error } = await query;

  const users = (rows ?? []) as AdminUserRowData[];

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav userLabel={profile.full_name} />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="User management"
          description="Assign roles and deactivate access (app-level)."
        />

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Narrow results by name/student ID/department, role, and access status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form method="get" action="/admin/users" className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">Search</label>
                <Input
                  name="q"
                  defaultValue={sp.q ?? ""}
                  placeholder="e.g. “Jane”, “S123”, “Engineering”"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">Role</label>
                <select name="role" defaultValue={sp.role ?? "all"} className={filterSelectClassName}>
                  <option value="all">Any</option>
                  <option value="admin">admin</option>
                  <option value="counselor">counselor</option>
                  <option value="receptionist">receptionist</option>
                  <option value="student">student</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">Access</label>
                <select name="active" defaultValue={sp.active ?? "all"} className={filterSelectClassName}>
                  <option value="all">Any</option>
                  <option value="true">Active</option>
                  <option value="false">Deactivated</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2 sm:col-span-3">
                <Button type="submit">Apply filters</Button>
                <Link
                  href="/admin/users"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Clear
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All profiles</CardTitle>
            <CardDescription>
              {error ? (
                <span className="text-destructive">Error loading users: {error.message}</span>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  {users.length} user(s)
                  {sp.q?.trim() ? <Badge variant="secondary">search</Badge> : null}
                  {role ? <Badge variant="secondary">{role}</Badge> : null}
                  {active !== null ? <Badge variant="secondary">{active ? "active" : "off"}</Badge> : null}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {users.length === 0 && !error ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No matching profiles. Try loosening filters.
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-[4.5rem] tabular-nums" title="GuidanceConnect user number">
                      ID
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <AdminUserRow key={u.id} user={u} currentUserId={user.id} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
