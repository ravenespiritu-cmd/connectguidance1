import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";
import Link from "next/link";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { cn } from "@/lib/utils";

type SearchParams = {
  user_id?: string;
  action?: string;
  table_name?: string;
  from?: string;
  to?: string;
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(400);

  const uid = sp.user_id?.trim();
  if (uid && z.string().uuid().safeParse(uid).success) {
    query = query.eq("user_id", uid);
  }

  const actionQ = sp.action?.trim();
  if (actionQ) {
    query = query.ilike("action", `%${actionQ}%`);
  }

  const tableQ = sp.table_name?.trim();
  if (tableQ) {
    query = query.ilike("table_name", `%${tableQ}%`);
  }

  if (sp.from) {
    const d = parseISO(sp.from);
    if (isValid(d)) {
      query = query.gte("created_at", startOfDay(d).toISOString());
    }
  }
  if (sp.to) {
    const d = parseISO(sp.to);
    if (isValid(d)) {
      query = query.lte("created_at", endOfDay(d).toISOString());
    }
  }

  const { data: rows, error } = await query;

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string }[] };

  const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="Audit logs"
          description="Sensitive changes from database triggers and app actions."
        />

        <form action="/admin/audit-logs" method="get" className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="f-user">User ID</Label>
              <Input id="f-user" name="user_id" defaultValue={sp.user_id ?? ""} placeholder="UUID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-action">Action</Label>
              <Input id="f-action" name="action" defaultValue={sp.action ?? ""} placeholder="e.g. UPDATE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-table">Table</Label>
              <Input id="f-table" name="table_name" defaultValue={sp.table_name ?? ""} placeholder="profiles" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-from">From</Label>
              <Input id="f-from" name="from" type="date" defaultValue={sp.from ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-to">To</Label>
              <Input id="f-to" name="to" type="date" defaultValue={sp.to ?? ""} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Apply filters</Button>
            <Link href="/admin/audit-logs" className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
              Clear
            </Link>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When (UTC)</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="max-w-[140px]">
                    <span className="text-xs font-mono">{r.user_id?.slice(0, 8) ?? "—"}…</span>
                    <br />
                    <span className="text-muted-foreground text-xs">{r.user_id ? (nameMap[r.user_id] ?? "") : ""}</span>
                  </TableCell>
                  <TableCell className="text-sm">{r.action}</TableCell>
                  <TableCell className="text-sm">{r.table_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs">{r.record_id ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {error ? (
            <p className="text-destructive p-4 text-sm">{error.message}</p>
          ) : (rows ?? []).length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">No rows match these filters.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
