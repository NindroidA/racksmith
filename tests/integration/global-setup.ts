import { PrismaClient } from "@prisma/client";

/**
 * One-time setup for the integration suite. Confirms the test Postgres
 * is reachable and that the schema looks current. Migrations are NOT
 * auto-applied here — run `bun run test:integration:prepare` once after
 * starting the test container.
 */
export async function setup() {
  const dsn =
    "postgresql://racksmith_test:racksmith_test@localhost:5433/racksmith_test?schema=public";
  const client = new PrismaClient({
    datasources: { db: { url: dsn } },
  });

  try {
    await client.$queryRaw`SELECT 1`;
  } catch (err) {
    await client.$disconnect();
    throw new Error(
      "Test Postgres not reachable on localhost:5433.\n" +
        "Start it and apply the schema:\n" +
        "  docker compose -f docker-compose.test.yml up -d\n" +
        "  bun run test:integration:prepare\n\n" +
        `Original error: ${(err as Error).message}`,
    );
  }

  // Sanity-check that the schema is in place. If `Organization` doesn't
  // exist, the prepare script hasn't run.
  try {
    await client.$queryRaw`SELECT 1 FROM "Organization" LIMIT 1`;
  } catch {
    await client.$disconnect();
    throw new Error(
      "Test DB schema is missing. Run: bun run test:integration:prepare",
    );
  }

  await client.$disconnect();
}

export async function teardown() {
  // Container persists; tmpfs wipes on container restart. No-op here.
}
