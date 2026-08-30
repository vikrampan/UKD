/**
 * Seeds the real UKD organisational tree and a bootstrap super admin.
 * Idempotent — safe to re-run.
 *
 *   npx tsx prisma/seed.ts
 */
import { PrismaClient, OrgUnitType, RoleKey, Sensitivity, UserStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const db = new PrismaClient();

/** Regions as the public site presents them. */
const REGIONS: Record<string, string[]> = {
  "गढ़वाल": ["देहरादून", "पौड़ी गढ़वाल", "टिहरी गढ़वाल", "उत्तरकाशी", "चमोली", "रुद्रप्रयाग"],
  "कुमाऊँ": ["अल्मोड़ा", "नैनीताल", "पिथौरागढ़", "बागेश्वर", "चम्पावत"],
  "तराई": ["हरिद्वार", "ऊधम सिंह नगर"],
};

async function unit(
  type: OrgUnitType,
  name: string,
  parent: { id: string; path: string; depth: number } | null,
) {
  const existing = await db.orgUnit.findFirst({
    where: { name, type, parentId: parent?.id ?? null },
  });
  if (existing) return existing;

  const created = await db.orgUnit.create({
    data: {
      type,
      name,
      nameHi: name,
      parentId: parent?.id ?? null,
      path: "",
      depth: parent ? parent.depth + 1 : 0,
    },
  });
  return db.orgUnit.update({
    where: { id: created.id },
    data: { path: parent ? `${parent.path}${created.id}.` : `${created.id}.` },
  });
}

async function main() {
  const party = await unit(OrgUnitType.PARTY, "उत्तराखंड क्रांति दल", null);
  const state = await unit(OrgUnitType.STATE, "उत्तराखंड", party);

  let districts = 0;
  for (const [regionName, districtNames] of Object.entries(REGIONS)) {
    const region = await unit(OrgUnitType.REGION, regionName, state);
    for (const d of districtNames) {
      await unit(OrgUnitType.DISTRICT, d, region);
      districts++;
    }
  }

  // Bootstrap admin. The password must be rotated on first sign-in; MFA is
  // off until the user enrols a device.
  const phone = process.env.SEED_ADMIN_PHONE ?? "9999999999";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow123";

  const admin = await db.user.upsert({
    where: { phone },
    update: {},
    create: {
      name: "प्रधान प्रशासक",
      phone,
      passwordHash: await hashPassword(password),
      status: UserStatus.ACTIVE,
    },
  });

  await db.grant.upsert({
    where: {
      userId_role_department_orgUnitId: {
        userId: admin.id,
        role: RoleKey.SUPER_ADMIN,
        department: "ADMIN",
        orgUnitId: party.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      role: RoleKey.SUPER_ADMIN,
      department: "ADMIN",
      orgUnitId: party.id,
      maxSensitivity: Sensitivity.SYSTEM,
    },
  });

  console.log(`seeded: 3 regions, ${districts} districts, admin ${phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
