/**
 * Minimal RFC 4180-ish CSV parser. Handles quoted fields, embedded commas,
 * escaped quotes (""). No external dependencies. Good enough for device CSV
 * imports where rows rarely exceed a few hundred.
 */

// Cells that begin with =, +, -, @, \t, or \r are interpreted as formulas by
// Excel / LibreOffice / Google Sheets (CWE-1236). Prefixing with an apostrophe
// neutralizes the formula behavior — the apostrophe is consumed by the
// spreadsheet but the cell renders as text. We prefix BEFORE the standard
// quoting check so the apostrophe is part of the quoted payload.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvSafeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  const neutralized = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Normalize line endings
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          // Escaped quote
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  // Trailing cell + row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/**
 * Parse CSV to an array of typed objects using the header row.
 * Maps CSV columns to device row fields.
 */
export type CsvDeviceRow = {
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  notes: string;
};

const FIELD_ALIASES: Record<string, keyof CsvDeviceRow> = {
  name: "name",
  "device name": "name",
  type: "deviceType",
  "device type": "deviceType",
  devicetype: "deviceType",
  manufacturer: "manufacturer",
  vendor: "manufacturer",
  brand: "manufacturer",
  model: "model",
  sizeu: "sizeU",
  "size u": "sizeU",
  size: "sizeU",
  u: "sizeU",
  ports: "portCount",
  portcount: "portCount",
  "port count": "portCount",
  power: "powerWatts",
  watts: "powerWatts",
  powerwatts: "powerWatts",
  "power (w)": "powerWatts",
  ip: "ipAddress",
  ipaddress: "ipAddress",
  "ip address": "ipAddress",
  mac: "macAddress",
  macaddress: "macAddress",
  "mac address": "macAddress",
  hostname: "hostname",
  host: "hostname",
  notes: "notes",
  description: "notes",
  comment: "notes",
};

export function csvToDeviceRows(
  rows: string[][],
): { ok: true; data: CsvDeviceRow[] } | { ok: false; error: string } {
  if (rows.length < 2) {
    return {
      ok: false,
      error: "CSV needs a header row + at least one data row",
    };
  }

  const [header, ...dataRows] = rows;
  const normalized = header.map((h) => h.trim().toLowerCase());
  const colMap: Partial<Record<keyof CsvDeviceRow, number>> = {};

  normalized.forEach((h, i) => {
    const field = FIELD_ALIASES[h];
    if (field) colMap[field] = i;
  });

  if (colMap.name == null || colMap.deviceType == null) {
    return {
      ok: false,
      error: `CSV missing required columns. Found: [${normalized.join(", ")}]. Need at minimum: name, type (or deviceType)`,
    };
  }

  const out: CsvDeviceRow[] = [];
  for (const row of dataRows) {
    const getStr = (key: keyof CsvDeviceRow, fallback = ""): string => {
      const idx = colMap[key];
      if (idx == null) return fallback;
      return (row[idx] ?? "").trim();
    };
    const getInt = (key: keyof CsvDeviceRow, fallback: number): number => {
      const s = getStr(key, "");
      if (!s) return fallback;
      const n = parseInt(s, 10);
      return isNaN(n) ? fallback : n;
    };
    const getOptInt = (key: keyof CsvDeviceRow): number | null => {
      const s = getStr(key, "");
      if (!s) return null;
      const n = parseInt(s, 10);
      return isNaN(n) ? null : n;
    };

    out.push({
      name: getStr("name"),
      deviceType: getStr("deviceType").toLowerCase() || "other",
      manufacturer: getStr("manufacturer").toLowerCase(),
      model: getStr("model"),
      sizeU: getInt("sizeU", 1),
      portCount: getInt("portCount", 0),
      powerWatts: getOptInt("powerWatts"),
      ipAddress: getStr("ipAddress") || null,
      macAddress: getStr("macAddress") || null,
      hostname: getStr("hostname") || null,
      notes: getStr("notes"),
    });
  }

  return { ok: true, data: out };
}
