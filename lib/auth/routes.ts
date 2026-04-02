export type AppRole = "admin" | "counselor" | "receptionist" | "student";

export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  counselor: "/counselor",
  receptionist: "/receptionist",
  student: "/student",
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return (
    value === "admin" ||
    value === "counselor" ||
    value === "receptionist" ||
    value === "student"
  );
}

/** Route prefixes that require an authenticated user with role `student`. */
export const STUDENT_ROUTE_PREFIXES = ["/student", "/appointments", "/chatbot"] as const;

export const ADMIN_ROUTE_PREFIXES = ["/admin"] as const;

export const COUNSELOR_ROUTE_PREFIXES = ["/counselor"] as const;

export const RECEPTIONIST_ROUTE_PREFIXES = ["/receptionist"] as const;

export function pathRequiresStudentRole(pathname: string): boolean {
  return STUDENT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function pathRequiresAdminRole(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function pathRequiresCounselorRole(pathname: string): boolean {
  return COUNSELOR_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function pathRequiresReceptionistRole(pathname: string): boolean {
  return RECEPTIONIST_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPagePath(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/register");
}
