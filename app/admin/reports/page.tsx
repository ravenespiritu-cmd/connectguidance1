"use client";

import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  generateReport,
  logReportExport,
  type ReportAppointmentRow,
  type ReportFilters,
} from "@/actions/reports";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function mostCommonConcern(rows: ReportAppointmentRow[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = r.concern_type.trim() || "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = "—";
  let n = 0;
  for (const [k, v] of counts) {
    if (v > n) {
      best = k;
      n = v;
    }
  }
  return n === 0 ? "—" : best;
}

function exportToPDF(
  rows: ReportAppointmentRow[],
  dateFromYmd: string,
  dateToYmd: string,
  isoFrom: string,
  isoTo: string,
  filters: ReportFilters,
) {
  const uni = process.env.NEXT_PUBLIC_UNIVERSITY_NAME?.trim() ?? "GuidanceConnect University";
  const completed = rows.filter((r) => r.status === "completed").length;
  const total = rows.length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const topConcern = mostCommonConcern(rows);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  doc.setFontSize(16);
  doc.text(uni, margin, y);
  y += 8;
  doc.setFontSize(12);
  doc.text("Appointments report", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Date range: ${dateFromYmd} → ${dateToYmd}`, margin, y);
  y += 5;
  doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.text("Summary", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Total appointments: ${total}`, margin, y);
  y += 5;
  doc.text(`Completion rate: ${rate}% (${completed} completed)`, margin, y);
  y += 5;
  doc.text(`Most common concern: ${topConcern}`, margin, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [
      ["When (UTC)", "Status", "Student", "Student dept", "Counselor", "Counselor dept", "Concern"],
    ],
    body: rows.map((r) => [
      format(new Date(r.scheduled_at), "yyyy-MM-dd HH:mm"),
      r.status,
      r.student_name,
      r.student_department ?? "—",
      r.counselor_name,
      r.counselor_department ?? "—",
      r.concern_type.slice(0, 80),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [180, 120, 40] },
  });

  doc.save(`guidanceconnect-report-${dateFromYmd}-to-${dateToYmd}.pdf`);
  void logReportExport(isoFrom, isoTo, filters);
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(endOfDay(new Date()), "yyyy-MM-dd"));
  const [department, setDepartment] = useState("");
  const [concernType, setConcernType] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportAppointmentRow[]>([]);
  const [didPreview, setDidPreview] = useState(false);

  const filters = useMemo<ReportFilters>(
    () => ({
      department: department.trim() || undefined,
      concern_type: concernType.trim() || undefined,
      status:
        status === "pending" || status === "confirmed" || status === "cancelled" || status === "completed"
          ? status
          : undefined,
    }),
    [department, concernType, status],
  );

  const summary = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, rate, topConcern: mostCommonConcern(rows) };
  }, [rows]);

  async function onPreview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDidPreview(true);
    try {
      const fromIso = startOfDay(parseISO(from)).toISOString();
      const toIso = endOfDay(parseISO(to)).toISOString();
      const res = await generateReport(fromIso, toIso, filters);
      if (!res.ok) {
        toast.error(res.error);
        setRows([]);
        return;
      }
      setRows(res.rows);
      if (res.rows.length === 0) {
        toast.message("No appointments in that range.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report failed.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function onExportPdf() {
    if (rows.length === 0) {
      toast.error("Run a preview with at least one row first.");
      return;
    }
    const fromIso = startOfDay(parseISO(from)).toISOString();
    const toIso = endOfDay(parseISO(to)).toISOString();
    try {
      exportToPDF(rows, from, to, fromIso, toIso, filters);
      toast.success("PDF downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    }
  }

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="Reports"
          description="Filter appointments, preview results, and export a PDF summary for compliance."
        />

        <Card>
          <CardHeader>
            <CardTitle>Appointment report</CardTitle>
            <CardDescription>Admin-only. All queries run on the server with role checks.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onPreview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="r-from">From</Label>
                  <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-to">To</Label>
                  <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-dept">Student department (contains)</Label>
                  <Input
                    id="r-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-concern">Concern type (exact)</Label>
                  <Input
                    id="r-concern"
                    value={concernType}
                    onChange={(e) => setConcernType(e.target.value)}
                    placeholder="Matches stored concern text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status || "__all__"}
                    onValueChange={(v) => setStatus(v == null || v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Loading…" : "Preview"}
                </Button>
                <Button type="button" variant="outline" onClick={onExportPdf} disabled={rows.length === 0}>
                  Export PDF
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {rows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                Total {summary.total} · Completion {summary.rate}% · Most common concern: {summary.topConcern}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Counselor</TableHead>
                    <TableHead>Concern</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(r.scheduled_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">{r.status}</TableCell>
                      <TableCell className="text-sm">{r.student_name}</TableCell>
                      <TableCell className="text-sm">{r.counselor_name}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{r.concern_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Building preview…</CardTitle>
              <CardDescription>Please wait while the server prepares report data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <div className="rounded-lg border">
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : didPreview ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No results</CardTitle>
              <CardDescription>Adjust your date range or filters and try again.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-muted-foreground">
                <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                  <SearchX className="size-5 opacity-80" aria-hidden />
                </div>
                <div className="space-y-1">
                  <p className="text-sm">No appointments matched the current filters.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {filters.department ? <Badge variant="secondary">dept</Badge> : null}
                    {filters.concern_type ? <Badge variant="secondary">concern</Badge> : null}
                    {filters.status ? <Badge variant="secondary">status</Badge> : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
