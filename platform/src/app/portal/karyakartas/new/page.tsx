import { requireActor } from "@/lib/session";
import { assignableUnits, grantableRoles, ROLE_LABEL, DEPARTMENT_LABEL } from "@/server/people";
import { Department } from "@prisma/client";
import { InviteForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewKaryakartaPage() {
  const actor = await requireActor();
  const [units, roles] = await Promise.all([
    assignableUnits(actor),
    Promise.resolve(grantableRoles(actor)),
  ]);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">नया सदस्य जोड़ें</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        खाता बनते ही एक अस्थायी पासवर्ड मिलेगा — वह केवल एक बार दिखेगा। उसे सदस्य तक
        पहुँचाएँ; पहली बार साइन इन करते ही उन्हें उसे बदलना होगा।
      </p>
      <InviteForm
        units={units}
        roles={roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
        departments={Object.values(Department).map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))}
      />
    </>
  );
}
