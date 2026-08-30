"use server";

import { revalidatePath } from "next/cache";
import { Department, RoleKey } from "@prisma/client";
import { z } from "zod";
import { requireActor } from "@/lib/session";
import { invitePerson, setActive } from "@/server/people";

const Invite = z.object({
  name: z.string().trim().min(2, "नाम लिखें।"),
  phone: z.string().regex(/^\d{10}$/, "10 अंकों का मोबाइल नंबर लिखें।"),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
  role: z.nativeEnum(RoleKey),
  department: z.nativeEnum(Department).default(Department.ORGANISATION),
  responsibilities: z.string().trim().optional(),
});

export type InviteState = {
  error?: string;
  created?: { name: string; phone: string; code: string; temporaryPassword: string };
};

export async function invitePersonAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const actor = await requireActor();

  const parsed = Invite.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    orgUnitId: formData.get("orgUnitId"),
    role: formData.get("role"),
    department: formData.get("department") || undefined,
    responsibilities: formData.get("responsibilities") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };
  }

  try {
    const result = await invitePerson(actor, parsed.data);
    revalidatePath("/portal/karyakartas");
    // Returned rather than redirected: the temporary password is shown once
    // and never stored anywhere retrievable.
    return {
      created: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        code: result.code,
        temporaryPassword: result.temporaryPassword,
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "सदस्य नहीं जोड़ा जा सका।" };
  }
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(formData.get("karyakartaId") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await setActive(actor, id, active);
  revalidatePath("/portal/karyakartas");
}
