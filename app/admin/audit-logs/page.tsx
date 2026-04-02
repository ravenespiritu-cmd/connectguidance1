import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";
import Link from "next/link";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

const PAGE_SIZE = 50;

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireAdmin();

  const pageRaw = sp.page ?? "1";
  const pageNum = z.coerce.number().int().positive().safeParse(pageRaw).success ? Number(pageRaw) : 1;
  const offset = (pageNum - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const uid = sp.userId?.trim();
  if (uid && z.string().uuid().safeParse(uid).success) {
    query = query.eq("user_id", uid);
  }

  const actionQ = sp.action?.trim();
  if (actionQ) {
    query = query.ilike("action", `%${actionQ}%`);
  }

  if (sp.dateFrom) {
    const d = parseISO(sp.dateFrom);
    if (isValid(d)) {
      query = query.gte("created_at", startOfDay(d).toISOString());
    }
  }
  if (sp.dateTo) {
    const d = parseISO(sp.dateTo);
    if (isValid(d)) {
      query = query.lte("created_at", endOfDay(d).toISOString());
    }
  }

  const { data: rows, error, count } = await query;

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string }[] };

  const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = pageNum > 1;
  const hasNext = pageNum < totalPages;

  function pageHref(p: number): string {
    const qs = new URLSearchParams();
    if (sp.userId) qs.set("userId", sp.userId);
    if (sp.action) qs.set("action", sp.action);
    if (sp.dateFrom) qs.set("dateFrom", sp.dateFrom);
    if (sp.dateTo) qs.set("dateTo", sp.dateTo);
    qs.set("page", String(p));
    return `/admin/audit-logs?${qs.toString()}`;
  }

  function actionBadgeClass(action: string): string {
    const a = action.toUpperCase();
    if (a === "INSERT") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (a === "UPDATE") return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
    if (a === "DELETE") return "bg-destructive/15 text-destructive dark:text-destructive border-destructive/30";
    if (a.includes("EXPORT")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    return "bg-secondary/60 text-secondary-foreground border-border";
  }

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav userLabel={profile.full_name} />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="Audit logs"
          description="App-level actions and sensitive row changes (triggers on profiles & case notes)."
        />

        <form action="/admin/audit-logs" method="get" className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
          <input type="hidden" name="page" value="1" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="f-user">User ID</Label>
              <Input id="f-user" name="userId" defaultValue={sp.userId ?? ""} placeholder="UUID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-action">Action</Label>
              <Input id="f-action" name="action" defaultValue={sp.action ?? ""} placeholder="e.g. UPDATE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-from">From</Label>
              <Input id="f-from" name="dateFrom" type="date" defaultValue={sp.dateFrom ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-to">To</Label>
              <Input id="f-to" name="dateTo" type="date" defaultValue={sp.dateTo ?? ""} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Apply filters</Button>
            <Link href="/admin/audit-logs" className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
              Clear
            </Link>
          </div>
        </form>

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            Page {pageNum} of {totalPages} · {total} row(s) matched
          </span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link href={pageHref(pageNum - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Previous
              </Link>
            ) : null}
            {hasNext ? (
              <Link href={pageHref(pageNum + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Next
              </Link>
            ) : null}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Audit entries</CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  Showing {Math.min(PAGE_SIZE, (rows ?? []).length)} of {total} matched row(s) (UTC).
                </p>
              </div>
              {sp.userId || sp.action || sp.dateFrom || sp.dateTo ? (
                <div className="flex flex-wrap gap-2">
                  {sp.userId ? <Badge variant="secondary">user</Badge> : null}
                  {sp.action ? <Badge variant="secondary">action</Badge> : null}
                  {sp.dateFrom || sp.dateTo ? <Badge variant="secondary">date</Badge> : null}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="p-4">
                <p className="text-destructive text-sm">{error.message}</p>
              </div>
            ) : (rows ?? []).length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground text-sm">No rows match these filters.</p>
                <p className="text-muted-foreground mt-1 text-xs">Try adjusting your date range or action search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record ID</TableHead>
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
                          <span className="text-muted-foreground text-xs">
                            {r.user_id ? nameMap[r.user_id] ?? "" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className={actionBadgeClass(r.action)}>
                            {r.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.table_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-mono text-xs">
                          {r.record_id ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
