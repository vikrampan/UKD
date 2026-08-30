import { TaskStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/server/tasks";

/** Colour encodes where in the lifecycle a task sits: green done, red stuck,
 *  amber waiting on someone, neutral in flight. */
const TONE: Record<TaskStatus, string> = {
  ASSIGNED: "bg-slate-100 text-slate-700",
  ACCEPTED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-sky-50 text-sky-800",
  SUBMITTED: "bg-amber-50 text-amber-800",
  UNDER_REVIEW: "bg-amber-50 text-amber-800",
  RESUBMITTED: "bg-amber-50 text-amber-800",
  CORRECTION_REQUIRED: "bg-ukd-red/10 text-ukd-red-dark",
  REJECTED: "bg-ukd-red/10 text-ukd-red-dark",
  APPROVED: "bg-ukd-green/10 text-ukd-green",
  CLOSED: "bg-ukd-green/10 text-ukd-green",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
