import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "@better-auth/core/utils/id";

const prisma = new PrismaClient();

const DEVICE_CATALOG = [
  // Cisco
  {
    name: "Cisco ISR 1100",
    manufacturer: "cisco",
    model: "ISR1100",
    deviceType: "router",
    sizeU: 1,
    portCount: 8,
    powerWatts: 60,
  },
  {
    name: "Cisco Catalyst 9200L-24T",
    manufacturer: "cisco",
    model: "C9200L-24T",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 65,
  },
  {
    name: "Cisco Catalyst 9300-48P",
    manufacturer: "cisco",
    model: "C9300-48P",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 715,
  },
  {
    name: "Cisco ASA 5506-X",
    manufacturer: "cisco",
    model: "ASA5506-X",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 8,
    powerWatts: 40,
  },

  // Ubiquiti
  {
    name: "UniFi Dream Machine Pro",
    manufacturer: "ubiquiti",
    model: "UDM-Pro",
    deviceType: "router",
    sizeU: 1,
    portCount: 11,
    powerWatts: 33,
  },
  {
    name: "UniFi Switch Enterprise 24 PoE",
    manufacturer: "ubiquiti",
    model: "USW-Enterprise-24-PoE",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 400,
  },
  {
    name: "UniFi Switch Pro 48 PoE",
    manufacturer: "ubiquiti",
    model: "USW-Pro-48-PoE",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 600,
  },
  {
    name: "UniFi Switch Aggregation",
    manufacturer: "ubiquiti",
    model: "USW-Aggregation",
    deviceType: "switch",
    sizeU: 1,
    portCount: 8,
    powerWatts: 35,
  },

  // Dell
  {
    name: "Dell PowerEdge R750",
    manufacturer: "dell",
    model: "R750",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 800,
  },
  {
    name: "Dell PowerEdge R650",
    manufacturer: "dell",
    model: "R650",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 600,
  },
  {
    name: "Dell PowerVault ME5024",
    manufacturer: "dell",
    model: "ME5024",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 580,
  },

  // HP
  {
    name: "HPE ProLiant DL380 Gen10",
    manufacturer: "hp",
    model: "DL380-Gen10",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 800,
  },
  {
    name: "HPE ProLiant DL360 Gen10",
    manufacturer: "hp",
    model: "DL360-Gen10",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 500,
  },
  {
    name: "HPE Aruba 6300M 24G",
    manufacturer: "hp",
    model: "6300M-24G",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 55,
  },

  // FS.com
  {
    name: "FS S5860-24XB-U",
    manufacturer: "fs",
    model: "S5860-24XB-U",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 150,
  },
  {
    name: "FS S3900-48T4S",
    manufacturer: "fs",
    model: "S3900-48T4S",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 65,
  },

  // TrippLite
  {
    name: "TrippLite SmartOnline 1500VA",
    manufacturer: "tripplite",
    model: "SU1500RTXL2UA",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 1200,
  },
  {
    name: "TrippLite SmartOnline 3000VA",
    manufacturer: "tripplite",
    model: "SU3000RTXL3U",
    deviceType: "ups",
    sizeU: 3,
    portCount: 0,
    powerWatts: 2400,
  },
  {
    name: "TrippLite PDU 24-Outlet",
    manufacturer: "tripplite",
    model: "PDUMV30HV",
    deviceType: "pdu",
    sizeU: 0,
    portCount: 24,
    powerWatts: 0,
  },

  // Generic
  {
    name: "24-Port Cat6 Patch Panel",
    manufacturer: "custom",
    model: "PP-24-CAT6",
    deviceType: "patch_panel",
    sizeU: 1,
    portCount: 24,
    powerWatts: 0,
  },
  {
    name: "48-Port Cat6a Patch Panel",
    manufacturer: "custom",
    model: "PP-48-CAT6A",
    deviceType: "patch_panel",
    sizeU: 2,
    portCount: 48,
    powerWatts: 0,
  },
  {
    name: "1U Brush Panel",
    manufacturer: "custom",
    model: "BP-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 0,
    description: "Cable management brush panel",
  },
  {
    name: "1U Blank Panel",
    manufacturer: "custom",
    model: "BLANK-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 0,
    description: "Blank filler panel",
  },
];

// Known-good dev credentials. Intentionally trivial — only ever written when
// NODE_ENV !== "production", so this cannot leak into prod even if the seed
// command is run against a deployed DB. Override via SEED_DEV_PASSWORD.
const DEV_EMAIL = "dev@racksmith.local";
const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD ?? "devpassword";
const DEV_NAME = "Dev User";
const DEV_ORG_NAME = "Dev Workspace";
const DEV_ORG_SLUG = "dev-workspace";

/**
 * Seed a known dev user + Pro-tier workspace so developers can log in locally
 * without registering each time. Only runs in non-production environments —
 * gated by the caller.
 *
 * Idempotent: re-running produces no duplicates. We upsert the User /
 * Organization / Member rows by stable keys (email / slug / composite
 * (userId, organizationId)) and upsert the Account row by stable id.
 *
 * Password path: we use Better Auth's own `hashPassword` (scrypt via
 * `@better-auth/utils/password`) to write the `Account.password` column
 * directly. This produces the exact hash format BA's login flow expects,
 * without having to stand up a Next request to call `auth.api.signUpEmail`
 * (which transitively imports `server-only` modules and can't run from a CLI
 * script).
 */
async function seedDevUser() {
  // 1. User row. Stable id so the Account foreign key stays consistent across
  //    re-runs. BA-style 32-char alphanumeric id.
  const DEV_USER_ID = "devuser0000000000000000000000000";
  const DEV_ACCOUNT_ID = "devaccount000000000000000000000000";

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {
      emailVerified: true,
      name: DEV_NAME,
    },
    create: {
      id: DEV_USER_ID,
      email: DEV_EMAIL,
      emailVerified: true,
      name: DEV_NAME,
    },
    select: { id: true },
  });

  // 2. Account row holding the password hash. BA's credential provider keys
  //    Account by `{ providerId: "credential", accountId: <userId> }`. We find
  //    it first (no unique index on that pair in the schema) and upsert by id.
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  const passwordHash = await hashPassword(DEV_PASSWORD);

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: DEV_ACCOUNT_ID,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  // 3. Pro-tier workspace. Keyed by slug — the unique index guarantees
  //    idempotence across re-runs.
  const org = await prisma.organization.upsert({
    where: { slug: DEV_ORG_SLUG },
    update: { plan: "pro", planExpiresAt: null },
    create: {
      name: DEV_ORG_NAME,
      slug: DEV_ORG_SLUG,
      plan: "pro",
    },
    select: { id: true },
  });

  // 4. Member link. Composite unique (userId, organizationId) keeps this
  //    idempotent — re-running just re-asserts the owner role.
  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: { role: "owner" },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  // 5. Point the user at the dev org so login lands straight in the dashboard.
  await prisma.user.update({
    where: { id: user.id },
    data: { activeOrganizationId: org.id },
  });

  console.log("");
  console.log(
    `✓ Dev user seeded: ${DEV_EMAIL} (password: $SEED_DEV_PASSWORD or the "devpassword" default)`,
  );
  console.log(`  Workspace: "${DEV_ORG_NAME}" (${DEV_ORG_SLUG}, plan=pro)`);
  console.log(`  Login at http://localhost:3000/login`);
  console.log("");
}

async function main() {
  console.log("Seeding device catalog...");

  for (const device of DEVICE_CATALOG) {
    await prisma.deviceCatalog.upsert({
      where: {
        manufacturer_model: {
          manufacturer: device.manufacturer,
          model: device.model,
        },
      },
      update: device,
      create: device,
    });
  }

  console.log(`Seeded ${DEVICE_CATALOG.length} devices in catalog.`);

  // Dev-login seed — non-production only. Never writes credentials to a prod
  // DB even by accident.
  if (process.env.NODE_ENV !== "production") {
    await seedDevUser();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
