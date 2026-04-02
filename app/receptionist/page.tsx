import { ReceptionistBookingForm } from "@/components/receptionist/ReceptionistBookingForm";
import { ReceptionistSubnav } from "@/components/receptionist/ReceptionistSubnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireReceptionist } from "@/lib/supabase/receptionist-guard";

export default async function ReceptionistPage() {
  const { user } = await requireReceptionist();

  return (
    <div className="from-background via-violet-50/25 to-background dark:via-violet-950/20 min-h-full flex-1 bg-gradient-to-b">
      <ReceptionistSubnav userLabel={user.email} />
      <div className="relative z-0 mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <div className="border-violet-500/15 from-violet-500/8 via-background rounded-2xl border bg-gradient-to-br to-transparent px-6 py-8 sm:px-8">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Front desk</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Book a student session</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Find the student, optionally pick a counselor or use next-available assignment, then choose a time. Available times
            respect each counselor&apos;s calendar (no double-booking for pending or confirmed sessions). Same hourly grid as
            online booking: 9:00 a.m.–4:00 p.m., one-hour blocks.
          </p>
        </div>

        <Card className="border-violet-200/50 shadow-sm dark:border-violet-500/20">
          <CardHeader>
            <CardTitle>New appointment</CardTitle>
            <CardDescription>
              The student receives the booking on their Appointments page immediately. Status starts as pending until the counselor
              confirms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReceptionistBookingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
