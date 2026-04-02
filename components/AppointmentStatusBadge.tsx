import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  confirmed: "border-emerald-600/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  cancelled: "text-muted-foreground border-border",
  completed: "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100",
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusStyles[status] ?? "")}>
      {status}
    </Badge>
  );
}
