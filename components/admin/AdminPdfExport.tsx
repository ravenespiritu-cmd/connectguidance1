"use client";

import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import { jsPDF } from "jspdf";
import { useState } from "react";
import { toast } from "sonner";

import { fetchAppointmentsForPdf } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminPdfExport() {
  const [from, setFrom] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(endOfDay(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const fromIso = startOfDay(parseISO(from)).toISOString();
    const toIso = endOfDay(parseISO(to)).toISOString();
    const res = await fetchAppointmentsForPdf(fromIso, toIso);
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    if (res.rows.length === 0) {
      toast.message("No appointments in that range.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 12;
    let y = margin;
    doc.setFontSize(14);
    doc.text("GuidanceConnect — Appointments", margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Range: ${from} → ${to} · ${res.rows.length} row(s)`, margin, y);
    y += 10;

    const cols = [margin, margin + 42, margin + 68, margin + 110, margin + 150];
    const headers = ["When (local)", "Status", "Student", "Counselor", "Concern"];
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.line(margin, y, 285, y);
    y += 6;

    const pageBottom = 195;
    for (const r of res.rows) {
      if (y > pageBottom) {
        doc.addPage();
        y = margin;
      }
      const when = format(new Date(r.scheduled_at), "MMM d yyyy HH:mm");
      const cells = [
        when,
        r.status,
        r.student_name.slice(0, 28),
        r.counselor_name.slice(0, 28),
        r.concern_type.slice(0, 45),
      ];
      cells.forEach((cell, i) => doc.text(cell, cols[i], y));
      y += 6;
    }

    doc.save(`guidanceconnect-appointments-${from}-to-${to}.pdf`);
    toast.success("PDF downloaded.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment export</CardTitle>
        <CardDescription>Pick a date range and generate a landscape table with jsPDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="space-y-2">
            <Label htmlFor="pdf-from">From</Label>
            <Input id="pdf-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-to">To</Label>
            <Input id="pdf-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button
          type="button"
          className="mt-6 bg-blue-700 text-white hover:bg-blue-800"
          onClick={generate}
          disabled={loading}
        >
          {loading ? "Building PDF…" : "Download PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
