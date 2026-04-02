"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { adminSetUserActive, adminUpdateUserRole } from "@/app/admin/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AdminUserRowData = {
  id: string;
  full_name: string;
  student_id: string | null;
  department: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

const roles = ["admin", "counselor", "student"] as const;

export function AdminUserRow({ user, currentUserId }: { user: AdminUserRowData; currentUserId: string }) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.is_active);
  const [busy, setBusy] = useState(false);

  async function onRoleChange(next: string) {
    setBusy(true);
    const res = await adminUpdateUserRole(user.id, next as (typeof roles)[number]);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      setRole(user.role);
      return;
    }
    setRole(next);
    toast.success("Role updated.");
    router.refresh();
  }

  async function onActiveChange(checked: boolean) {
    const prev = active;
    setActive(checked);
    setBusy(true);
    const res = await adminSetUserActive(user.id, checked);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      setActive(prev);
      return;
    }
    toast.success(checked ? "User activated." : "User deactivated.");
    router.refresh();
  }

  const isSelf = user.id === currentUserId;

  return (
    <TableRow className={cn(!active && "opacity-70")}>
      <TableCell className="font-medium">{user.full_name}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{user.student_id ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground max-w-[140px] truncate text-sm">{user.department ?? "—"}</TableCell>
      <TableCell>
        <Select value={role} onValueChange={(v) => (v ? onRoleChange(v) : null)} disabled={busy}>
          <SelectTrigger className="w-[130px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={onActiveChange} disabled={busy || isSelf} />
          <span className="text-muted-foreground text-xs">{active ? "Active" : "Off"}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
