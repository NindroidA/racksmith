import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HealthStatus = {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptimeSec: number;
  version: string;
  checks: {
    database: { ok: boolean; latencyMs?: number; error?: string };
    migrations: { ok: boolean; applied?: number; error?: string };
  };
};

const bootedAt = Date.now();
const VERSION = process.env.npm_package_version || "0.0.0";

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function checkMigrations() {
  try {
    const rows = (await prisma.$queryRaw`
      SELECT COUNT(*)::int AS applied
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `) as Array<{ applied: number }>;
    return { ok: true, applied: rows[0]?.applied ?? 0 };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function GET() {
  const [database, migrations] = await Promise.all([
    checkDatabase(),
    checkMigrations(),
  ]);

  const critical = database.ok;
  const allOk = critical && migrations.ok;

  const body: HealthStatus = {
    status: allOk ? "ok" : critical ? "degraded" : "down",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - bootedAt) / 1000),
    version: VERSION,
    checks: { database, migrations },
  };

  return NextResponse.json(body, { status: critical ? 200 : 503 });
}
