import { describe, expect, it } from "vitest";

import {
  isAppRole,
  pathRequiresAdminRole,
  pathRequiresCounselorRole,
  pathRequiresReceptionistRole,
  pathRequiresStudentRole,
} from "@/lib/auth/routes";

describe("auth routes helpers", () => {
  it("isAppRole", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("counselor")).toBe(true);
    expect(isAppRole("student")).toBe(true);
    expect(isAppRole("receptionist")).toBe(true);
    expect(isAppRole("superuser")).toBe(false);
    expect(isAppRole(null)).toBe(false);
  });

  it("pathRequiresStudentRole", () => {
    expect(pathRequiresStudentRole("/student")).toBe(true);
    expect(pathRequiresStudentRole("/student/settings")).toBe(true);
    expect(pathRequiresStudentRole("/appointments")).toBe(true);
    expect(pathRequiresStudentRole("/chatbot")).toBe(true);
    expect(pathRequiresStudentRole("/admin")).toBe(false);
    expect(pathRequiresStudentRole("/student-helper")).toBe(false);
  });

  it("pathRequiresAdminRole", () => {
    expect(pathRequiresAdminRole("/admin")).toBe(true);
    expect(pathRequiresAdminRole("/admin/users")).toBe(true);
    expect(pathRequiresAdminRole("/")).toBe(false);
  });

  it("pathRequiresCounselorRole", () => {
    expect(pathRequiresCounselorRole("/counselor")).toBe(true);
    expect(pathRequiresCounselorRole("/counselor/case-notes/123")).toBe(true);
    expect(pathRequiresCounselorRole("/counselors")).toBe(false);
  });

  it("pathRequiresReceptionistRole", () => {
    expect(pathRequiresReceptionistRole("/receptionist")).toBe(true);
    expect(pathRequiresReceptionistRole("/receptionist/history")).toBe(true);
    expect(pathRequiresReceptionistRole("/admin")).toBe(false);
  });
});
