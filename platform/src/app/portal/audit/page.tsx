import { requireActor } from "@/lib/session";
import { db } from "@/lib/db";
import { RoleKey } from "@prisma/client";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

/** Plain-language names for what the log records. */
const ACTION_LABEL: Record<string, string> = {
  "auth.login": "साइन इन",
  "auth.login.mfa": "साइन इन (दो-चरणीय)",
  "auth.login.failed": "साइन इन विफल",
  "auth.mfa.failed": "कोड ग़लत",
  "auth.mfa.enable": "दो-चरणीय चालू",
  "auth.mfa.disable": "दो-चरणीय बंद",
  "auth.logout": "साइन आउट",
  "auth.password.change": "पासवर्ड बदला",
  "person.invite": "सदस्य जोड़ा",
  "person.suspend": "सदस्य निलंबित",
  "person.reactivate": "सदस्य पुनः सक्रिय",
  "task.create": "कार्य बनाया",
  "task.transition": "कार्य की स्थिति बदली",
  "issue.submit": "जन समस्या दर्ज",
  "issue.advance": "समस्या की स्थिति बदली",
  "notice.issue": "सूचना जारी",
  "notice.acknowledge": "सूचना की पावती",
  "report.period.open": "रिपोर्ट अवधि खोली",
  "report.submit": "रिपोर्ट जमा",
  "ledger.record": "वित्तीय प्रविष्टि",
  "ledger.approve": "प्रविष्टि स्वीकृत",
  "ledger.reject": "प्रविष्टि अस्वीकृत",
  "event.create": "कार्यक्रम बनाया",
  "event.complete": "कार्यक्रम सम्पन्न",
  "document.add": "दस्तावेज़ जोड़ा",
  "announcement.write": "सूचना लिखी",
  "announcement.publish": "सूचना प्रकाशित",
  "announcement.unpublish": "सूचना अप्रकाशित",
  "ticket.raise": "सहायता अनुरोध",
  "ticket.advance": "अनुरोध की स्थिति बदली",
  "meeting.schedule": "बैठक निर्धारित",
  "meeting.minutes": "कार्यवृत्त दर्ज",
  "decision.to_task": "निर्णय से कार्य बना",
};

export default async function AuditPage() {
  const actor = await requireActor();

  // The trail names who did what; only the most senior roles may read it.
  const permitted = actor.grants.some(
    (g) => g.role === RoleKey.SUPER_ADMIN || g.role === RoleKey.CENTRAL_ADMIN,
  );
  if (!permitted) {
    return (
      <div className="max-w-lg rounded-xl border border-ukd-line bg-white p-8">
        <h1 className="text-xl font-bold">अंकेक्षण</h1>
        <p className="mt-2 text-ukd-mute">इस अनुभाग के लिए आपके पास अनुमति नहीं है।</p>
      </div>
    );
  }

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { at: "desc" },
      take: 200,
    }),
    db.auditLog.count(),
  ]);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">अंकेक्षण</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        संगठन में हुई हर महत्वपूर्ण कार्रवाई का स्थायी रिकॉर्ड। यह सूची न बदली जा सकती है,
        न मिटाई — डेटाबेस स्वयं इसकी रक्षा करता है। कुल {total.toLocaleString("en-IN")} प्रविष्टियाँ,
        नवीनतम {entries.length} नीचे।
      </p>

      <div className="overflow-x-auto rounded-xl border border-ukd-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ukd-line text-left text-ukd-mute">
            <tr>
              <th className="px-4 py-3 font-semibold">कब</th>
              <th className="px-4 py-3 font-semibold">किसने</th>
              <th className="px-4 py-3 font-semibold">क्या</th>
              <th className="px-4 py-3 font-semibold">किस पर</th>
              <th className="px-4 py-3 font-semibold">कहाँ से</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-ukd-line last:border-0">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ukd-mute">{fmt.format(e.at)}</td>
                <td className="whitespace-nowrap px-4 py-3">{e.actor?.name ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">
                  {ACTION_LABEL[e.action] ?? e.action}
                  {e.action.endsWith(".failed") && (
                    <span className="ms-2 rounded-full bg-ukd-red/10 px-2 py-0.5 text-xs text-ukd-red-dark">
                      विफल
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ukd-mute">{e.entity}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ukd-mute">{e.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
