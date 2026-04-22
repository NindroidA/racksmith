"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { parseCsv, csvToDeviceRows, type CsvDeviceRow } from "@/lib/csv";
import { importDevices } from "@/app/(dashboard)/devices/actions";
import { describeError } from "@/lib/error-message";

const SAMPLE_CSV = `name,deviceType,manufacturer,model,sizeU,portCount,powerWatts,ipAddress,macAddress,hostname,notes
Main Switch,switch,cisco,C9300-48P,1,48,715,192.168.1.10,aa:bb:cc:dd:ee:ff,sw-core-01,Core switch
Edge Router,router,ubiquiti,UDM-Pro,1,11,33,192.168.1.1,aa:bb:cc:11:22:33,router-01,Primary router
App Server,server,dell,R750,2,4,800,192.168.1.20,,app-01,Main application server
`;

export function DeviceImportClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvDeviceRow[]>([]);
  const [filename, setFilename] = useState<string | null>(null);

  function handleFile(file: File) {
    if (!file) return;
    setFilename(file.name);
    setParseError(null);
    setRows([]);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      const result = csvToDeviceRows(parsed);
      if (!result.ok) {
        setParseError(result.error);
        return;
      }
      setRows(result.data);
    };
    reader.onerror = () => setParseError("Failed to read file");
    reader.readAsText(file);
  }

  function handleImport() {
    if (rows.length === 0) return;
    startTransition(async () => {
      try {
        const result = await importDevices(rows);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const { created, skipped, errors } = result.data;
        if (skipped > 0) {
          toast.success(
            `Imported ${created} devices (${skipped} skipped: ${errors.slice(0, 2).join("; ")})`
          );
        } else {
          toast.success(`Imported ${created} devices`);
        }
        router.push("/devices");
      } catch (err) {
        toast.error(describeError(err, "Import failed"));
      }
    });
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "racksmith-devices-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/devices"
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Devices
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Import Devices from CSV</h1>
        <p className="mt-1 text-white/60">
          Bulk-add devices by uploading a CSV file. Columns are case-insensitive.
        </p>
      </div>

      <section className="mb-6 glass-card rounded-xl p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
          Expected columns
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <div>
            <span className="text-accent-red">*</span>{" "}
            <span className="font-mono text-white">name</span>
          </div>
          <div>
            <span className="text-accent-red">*</span>{" "}
            <span className="font-mono text-white">deviceType</span>
            <div className="text-xs text-white/40">
              router, switch, server, firewall, ups, patch_panel, pdu, storage, other
            </div>
          </div>
          <div>
            <span className="font-mono text-white/70">manufacturer</span>
          </div>
          <div>
            <span className="font-mono text-white/70">model</span>
          </div>
          <div>
            <span className="font-mono text-white/70">sizeU</span>
          </div>
          <div>
            <span className="font-mono text-white/70">portCount</span>
          </div>
          <div>
            <span className="font-mono text-white/70">powerWatts</span>
          </div>
          <div>
            <span className="font-mono text-white/70">ipAddress</span>
          </div>
          <div>
            <span className="font-mono text-white/70">macAddress</span>
          </div>
          <div>
            <span className="font-mono text-white/70">hostname</span>
          </div>
          <div>
            <span className="font-mono text-white/70">notes</span>
          </div>
        </div>

        <button
          onClick={downloadSample}
          className="glass-button inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white"
        >
          <FileText className="h-3.5 w-3.5" />
          Download sample CSV
        </button>
      </section>

      {/* Upload zone */}
      <section className="mb-6 glass-card rounded-xl p-6">
        <label
          htmlFor="csv-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-10 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
        >
          <Upload className="h-8 w-8 text-white/40" />
          <div className="text-center">
            <div className="text-sm font-medium text-white">
              {filename ?? "Click to upload CSV"}
            </div>
            <div className="text-xs text-white/50">
              or drop a .csv file here
            </div>
          </div>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </section>

      {parseError && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Could not parse CSV</div>
            <div className="mt-1 opacity-80">{parseError}</div>
          </div>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
              <CheckCircle2 className="h-4 w-4 text-accent-green" />
              Preview — {rows.length} rows
            </h2>
            <span className="text-xs text-white/40">
              Showing first {Math.min(rows.length, 10)}
            </span>
          </div>
          <div className="glass-card overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Mfr</th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium">U</th>
                    <th className="px-3 py-2 font-medium">Ports</th>
                    <th className="px-3 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-white">{r.name}</td>
                      <td className="px-3 py-2 text-white/70">{r.deviceType}</td>
                      <td className="px-3 py-2 text-white/70">
                        {r.manufacturer || "—"}
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        {r.model || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-white/70">
                        {r.sizeU}
                      </td>
                      <td className="px-3 py-2 font-mono text-white/70">
                        {r.portCount}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-white/60">
                        {r.ipAddress || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => {
                setRows([]);
                setFilename(null);
                setParseError(null);
              }}
              className="text-sm text-white/50 hover:text-white/80"
            >
              Clear
            </button>
            <button
              onClick={handleImport}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {pending ? "Importing..." : `Import ${rows.length} devices`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
