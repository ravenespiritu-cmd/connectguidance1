import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPdfExport } from "@/components/admin/AdminPdfExport";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { requireAdmin } from "@/lib/supabase/admin-guard";

export default async function AdminReportsPage() {
  await requireAdmin();
  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="Reports"
          description="Exports for compliance and operations."
        />
        <AdminPdfExport />
      </div>
    </div>
  );
}
