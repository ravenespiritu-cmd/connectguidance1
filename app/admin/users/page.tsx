import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { AdminUserRow, type AdminUserRowData } from "@/components/admin/AdminUserRow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/supabase/admin-guard";

export default async function AdminUsersPage() {
  const { supabase, user } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, full_name, student_id, department, role, is_active, created_at")
    .order("created_at", { ascending: false });

  const users = (rows ?? []) as AdminUserRowData[];

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="User management"
          description="Assign roles and deactivate access (app-level)."
        />

        <Card>
          <CardHeader>
            <CardTitle>All profiles</CardTitle>
            <CardDescription>
              {error ? `Error loading users: ${error.message}` : `${users.length} user(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
            {users.length === 0 && !error ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No users found.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
