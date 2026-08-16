export type Role = "student" | "admin";

export type Permission =
  | "manageContent"
  | "editOwnProfile";

export const rolePermissions: Record<Role, readonly Permission[]> = {
  student: ["editOwnProfile"],
  admin: ["manageContent", "editOwnProfile"],
};

export function hasPermission(
  role: Role,
  permission: Permission
): boolean {
  return rolePermissions[role].includes(permission);
}