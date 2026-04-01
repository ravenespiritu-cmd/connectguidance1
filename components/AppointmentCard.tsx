type AppointmentCardProps = {
  title: string;
  subtitle: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

export default function AppointmentCard({ title, subtitle, status }: AppointmentCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <p className="mt-2 text-xs uppercase tracking-wide">{status}</p>
    </div>
  );
}
