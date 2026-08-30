/**
 * Figures for the public homepage.
 *
 * Only counts things that genuinely exist. The site previously displayed
 * invented statistics under an "आधिकारिक वेबसाइट" banner; anything here is a
 * real row count or it is not shown.
 */
import { IssueStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { publicJson, preflight } from "@/lib/publicApi";

export const dynamic = "force-dynamic";
export function OPTIONS(req: Request) { return preflight(req); }

export async function GET(req: Request) {
  const [districts, karyakartas, issuesTotal, issuesResolved] = await Promise.all([
    db.orgUnit.count({ where: { type: "DISTRICT", isActive: true } }),
    db.karyakarta.count({ where: { isActive: true } }),
    db.issue.count(),
    db.issue.count({ where: { status: { in: [IssueStatus.RESOLVED, IssueStatus.CLOSED] } } }),
  ]);

  return publicJson(req, {
    stats: { districts, karyakartas, issuesTotal, issuesResolved },
  });
}
