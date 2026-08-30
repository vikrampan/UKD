/**
 * Portal modules and who may see them.
 *
 * This is presentation only — hiding a module is a convenience, never a
 * security boundary. Every route still resolves its own actor and scopes its
 * own queries. The prototype's mistake was treating this list as the control.
 */
import { RoleKey } from "@prisma/client";
import type { Actor } from "@/lib/rbac";

export type Module = {
  href: string;
  label: string;
  /** Roles that may see it. Empty means everyone signed in. */
  roles?: RoleKey[];
};

const ALL_ADMIN: RoleKey[] = [
  RoleKey.SUPER_ADMIN,
  RoleKey.TOP_LEADERSHIP,
  RoleKey.CENTRAL_ADMIN,
  RoleKey.STATE_ADMIN,
  RoleKey.DISTRICT_ADMIN,
];

export const MODULES: Module[] = [
  { href: "/portal", label: "डैशबोर्ड" },
  { href: "/portal/tasks", label: "कार्य" },
  { href: "/portal/organisation", label: "संगठन" },
  { href: "/portal/karyakartas", label: "कार्यकर्ता", roles: ALL_ADMIN },
  { href: "/portal/notices", label: "सूचनाएँ" },
  { href: "/portal/issues", label: "जन समस्याएँ", roles: ALL_ADMIN },
  { href: "/portal/reports", label: "रिपोर्ट" },
  { href: "/portal/analytics", label: "विश्लेषण", roles: ALL_ADMIN },
  { href: "/portal/audit", label: "अंकेक्षण", roles: [RoleKey.SUPER_ADMIN, RoleKey.CENTRAL_ADMIN] },
  { href: "/portal/settings", label: "सेटिंग्स" },
];

export function visibleModules(actor: Actor): Module[] {
  const held = new Set(actor.grants.map((g) => g.role));
  return MODULES.filter((m) => !m.roles || m.roles.some((r) => held.has(r)));
}
