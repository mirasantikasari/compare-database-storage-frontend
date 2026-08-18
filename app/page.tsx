"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { getProviders, runReconciliation } from "@/store/controller/storageController";
import {
  providerSelected,
  summaryStreamStarted,
  summaryStreamProgress,
  summaryStreamSucceeded,
  summaryStreamFailed,
  autoReconciliationStreamStarted,
  autoReconciliationStreamProgress,
  autoReconciliationStreamSucceeded,
  autoReconciliationStreamFailed,
} from "@/store/slices/storageSlice";
import type { TableColumnMapping } from "@/store/types/StorageType";
import api from "@/services/api";

class StreamConnectionError extends Error {
  reportFile?: string;
  constructor(message: string, reportFile?: string) {
    super(message);
    this.name = "StreamConnectionError";
    this.reportFile = reportFile;
  }
}

/**
 * Consumes a backend SSE endpoint (progress events + a final "done"/"error" event), with
 * stall detection: the backend sends a heartbeat every 15s even between real events, so if
 * nothing at all arrives for a while, or the connection closes without ever reaching a
 * terminal event, that's treated as a connection failure rather than leaving the caller's
 * "loading" state stuck forever (both have happened on this network — a silent stall, and a
 * clean-looking early close from a proxy/network drop mid-scan).
 *
 * `onEvent` handles the event's own meaning (dispatch progress/success/failure) and returns
 * `true` once it has seen a terminal event ("done" or "error").
 */
async function streamSSE(
  url: string,
  onEvent: (eventName: string, data: any) => boolean | Promise<boolean>
): Promise<void> {
  const STALL_TIMEOUT_MS = 40000;
  const abortController = new AbortController();
  let stallTimer: ReturnType<typeof setTimeout> = setTimeout(() => {}, 0);
  let lastReportFile: string | undefined;
  let finished = false;

  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => abortController.abort(), STALL_TIMEOUT_MS);
  };

  try {
    resetStallTimer();
    const response = await fetch(url, { signal: abortController.signal });
    if (!response.ok || !response.body) {
      throw new StreamConnectionError(`Request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      resetStallTimer();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        const eventMatch = rawEvent.match(/^event: (.+)$/m);
        const dataMatch = rawEvent.match(/^data: (.+)$/m);
        if (!eventMatch || !dataMatch) continue;

        const eventName = eventMatch[1];
        const data = JSON.parse(dataMatch[1]);
        if (data?.reportFile) lastReportFile = data.reportFile;

        if (await onEvent(eventName, data)) finished = true;
      }
    }
    clearTimeout(stallTimer);

    if (!finished) {
      throw new StreamConnectionError(
        `Connection closed before the scan finished.${
          lastReportFile ? ` A partial report was saved: ${lastReportFile}.` : ""
        } Please retry.`,
        lastReportFile
      );
    }
  } catch (err) {
    clearTimeout(stallTimer);
    if (err instanceof StreamConnectionError) throw err;
    const isStall = err instanceof Error && err.name === "AbortError";
    throw new StreamConnectionError(
      isStall
        ? `Connection stalled — no response from the server for a while.${
            lastReportFile ? ` A partial report was saved: ${lastReportFile}.` : ""
          } Please retry.`
        : err instanceof Error
          ? err.message
          : "Network error",
      lastReportFile
    );
  }
}

function bucketsLabelClient(buckets?: string[]): string {
  if (!buckets || buckets.length === 0) return "all-buckets";
  if (buckets.length <= 3) return buckets.join("+");
  return `${buckets.length}-buckets`;
}

/**
 * Mirrors the backend's buildReportFileName so a filename is available to poll for even if the
 * stream stalls before the server ever confirms one in an event — the scan keeps running
 * server-side regardless of the browser connection, so the file still shows up under this name.
 * Best-effort: assumes the browser's local date matches the server's.
 */
function predictReportFileName(parts: Array<string | undefined>): string {
  const segments = parts
    .filter((p): p is string => !!p && p.length > 0)
    .map((p) => p.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  segments.push(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  return `${segments.join("-")}.xlsx`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const cardClass =
  "rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-black";
const inputClass =
  "rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white";
const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black";
const secondaryButtonClass =
  "rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700";

export default function Home() {
  const dispatch = useAppDispatch();
  const {
    providers,
    loadingProviders,
    errorProviders,
    selectedProvider,
    summary,
    loadingSummary,
    errorSummary,
    summaryProgress,
    reconciliation,
    loadingReconciliation,
    errorReconciliation,
    autoReconciliation,
    loadingAutoReconciliation,
    errorAutoReconciliation,
    autoReconciliationProgress,
  } = useAppSelector((state) => state.storage);

  const [summaryBuckets, setSummaryBuckets] = useState("");
  const [summaryPrefix, setSummaryPrefix] = useState("");

  const [reconBuckets, setReconBuckets] = useState("");
  const [reconPrefix, setReconPrefix] = useState("");
  const [mappings, setMappings] = useState<TableColumnMapping[]>([
    { table: "", column: "", idColumn: "" },
  ]);

  const [autoReconDatabase, setAutoReconDatabase] = useState("");
  const [autoReconBuckets, setAutoReconBuckets] = useState("");
  const [autoReconPrefix, setAutoReconPrefix] = useState("");

  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Set when a stream stalls/closes before finishing, so the UI can still offer a way to fetch
  // the report once the server-side scan (which keeps running regardless) finishes producing it.
  const [summaryRecoveryFile, setSummaryRecoveryFile] = useState<string | null>(null);
  const [autoReconRecoveryFile, setAutoReconRecoveryFile] = useState<string | null>(null);

  useEffect(() => {
    dispatch(getProviders());
  }, [dispatch]);

  const downloadReport = async (filename: string) => {
    setDownloadingReport(filename);
    setDownloadError(null);
    try {
      const response = await api.get(`/reports/${encodeURIComponent(filename)}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setDownloadError(
        status === 404
          ? `Laporan "${filename}" belum tersedia — proses di server mungkin masih berjalan. Coba lagi beberapa saat lagi.`
          : `Failed to download ${filename}`
      );
    } finally {
      setDownloadingReport(null);
    }
  };

  const updateMapping = (index: number, field: keyof TableColumnMapping, value: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const addMapping = () => setMappings((prev) => [...prev, { table: "", column: "", idColumn: "" }]);
  const removeMapping = (index: number) =>
    setMappings((prev) => prev.filter((_, i) => i !== index));

  const onGetSummary = async () => {
    dispatch(summaryStreamStarted());
    setSummaryRecoveryFile(null);

    const summaryBucketList = summaryBuckets.trim()
      ? summaryBuckets.split(",").map((b) => b.trim()).filter(Boolean)
      : undefined;

    const params = new URLSearchParams();
    if (summaryBuckets.trim()) params.set("buckets", summaryBuckets.trim());
    if (summaryPrefix.trim()) params.set("prefix", summaryPrefix.trim());
    if (selectedProvider) params.set("provider", selectedProvider);
    params.set("export", "true");

    try {
      await streamSSE(
        `${process.env.NEXT_PUBLIC_API_URL}/storage/summary/stream?${params.toString()}`,
        async (eventName, data) => {
          if (eventName === "progress") {
            dispatch(summaryStreamProgress(data));
            return false;
          }
          if (eventName === "done") {
            dispatch(summaryStreamSucceeded(data));
            if (data.reportFile) await downloadReport(data.reportFile);
            return true;
          }
          if (eventName === "error") {
            dispatch(summaryStreamFailed(data.message ?? "Failed to load summary"));
            return true;
          }
          return false;
        }
      );
    } catch (err) {
      setSummaryRecoveryFile(
        (err instanceof StreamConnectionError && err.reportFile) ||
          predictReportFileName(["storage", bucketsLabelClient(summaryBucketList)])
      );
      dispatch(summaryStreamFailed(err instanceof Error ? err.message : "Network error"));
    }
  };

  const onAutoReconciliation = async () => {
    if (!autoReconDatabase.trim()) return;

    dispatch(autoReconciliationStreamStarted());
    setAutoReconRecoveryFile(null);

    const autoReconBucketList = autoReconBuckets.trim()
      ? autoReconBuckets.split(",").map((b) => b.trim()).filter(Boolean)
      : undefined;

    const params = new URLSearchParams();
    params.set("database", autoReconDatabase.trim());
    if (autoReconBuckets.trim()) params.set("buckets", autoReconBuckets.trim());
    if (autoReconPrefix.trim()) params.set("prefix", autoReconPrefix.trim());
    if (selectedProvider) params.set("provider", selectedProvider);

    try {
      await streamSSE(
        `${process.env.NEXT_PUBLIC_API_URL}/reconciliation/auto/stream?${params.toString()}`,
        async (eventName, data) => {
          if (eventName === "discovered") {
            dispatch(
              autoReconciliationStreamProgress({
                phase: "discovering",
                completed: 0,
                total: data.mappingCount,
                percent: 0,
                label: `Found ${data.mappingCount} candidate column(s)`,
                mappingCount: data.mappingCount,
              })
            );
            return false;
          }
          if (eventName === "progress") {
            dispatch(
              autoReconciliationStreamProgress({
                phase: data.phase,
                completed: data.completed,
                total: data.total,
                percent: data.percent,
                label: data.label,
              })
            );
            return false;
          }
          if (eventName === "done") {
            dispatch(autoReconciliationStreamSucceeded(data));
            if (data.reportFile) await downloadReport(data.reportFile);
            return true;
          }
          if (eventName === "error") {
            dispatch(autoReconciliationStreamFailed(data.message ?? "Reconciliation failed"));
            return true;
          }
          return false;
        }
      );
    } catch (err) {
      setAutoReconRecoveryFile(
        (err instanceof StreamConnectionError && err.reportFile) ||
          predictReportFileName([autoReconDatabase.trim(), bucketsLabelClient(autoReconBucketList)])
      );
      dispatch(
        autoReconciliationStreamFailed(err instanceof Error ? err.message : "Network error")
      );
    }
  };

  const onRunReconciliation = () => {
    const cleanMappings = mappings
      .map((m) => ({
        table: m.table.trim(),
        column: m.column.trim(),
        idColumn: m.idColumn?.trim() || undefined,
      }))
      .filter((m) => m.table && m.column);

    if (cleanMappings.length === 0) return;

    dispatch(
      runReconciliation({
        buckets: reconBuckets.trim()
          ? reconBuckets.split(",").map((b) => b.trim()).filter(Boolean)
          : undefined,
        prefix: reconPrefix.trim() || undefined,
        mappings: cleanMappings,
        provider: selectedProvider || undefined,
      })
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-xl font-semibold">Object Storage & MySQL Reconciler</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Read-only audit dashboard — nothing here deletes, modifies, or uploads objects.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">Storage provider</label>
          <select
            className={inputClass}
            value={selectedProvider}
            disabled={loadingProviders || providers.length === 0}
            onChange={(e) => dispatch(providerSelected(e.target.value))}
          >
            {providers.length === 0 && <option value="">(none configured)</option>}
            {providers.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
                {p.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
          {loadingProviders && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
          )}
          {errorProviders && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {errorProviders.message}
            </span>
          )}
        </div>
      </header>

      <section className={cardClass}>
        <h2 className="mb-1 text-sm font-semibold">Buckets</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Object count and total size per bucket. Leave buckets blank to scan all. Loading
          buckets generates and downloads the .xlsx report automatically.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Buckets (comma-separated)
            </label>
            <input
              className={inputClass}
              placeholder="all buckets"
              value={summaryBuckets}
              onChange={(e) => setSummaryBuckets(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Prefix</label>
            <input
              className={inputClass}
              placeholder="images/"
              value={summaryPrefix}
              onChange={(e) => setSummaryPrefix(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={buttonClass}
            disabled={loadingSummary}
            onClick={onGetSummary}
          >
            {loadingSummary ? "Loading..." : "Load buckets"}
          </button>
        </div>

        {loadingSummary && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-black transition-all dark:bg-white"
                style={{ width: `${summaryProgress?.percent ?? 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {summaryProgress
                ? `${summaryProgress.percent}% — ${summaryProgress.completed}/${summaryProgress.total} buckets scanned (last: ${summaryProgress.bucket}${summaryProgress.error ? ` — failed: ${summaryProgress.error}` : ""})`
                : "Starting scan..."}
            </p>
            {summaryProgress?.reportFile && (
              <button
                type="button"
                className="mt-2 text-xs font-medium underline disabled:opacity-50"
                disabled={downloadingReport === summaryProgress.reportFile}
                onClick={() => downloadReport(summaryProgress.reportFile!)}
              >
                {downloadingReport === summaryProgress.reportFile
                  ? "Downloading..."
                  : `Download results so far (${summaryProgress.completed}/${summaryProgress.total} buckets)`}
              </button>
            )}
          </div>
        )}

        {errorSummary && (
          <div className="mt-3">
            <p className="text-sm text-red-600 dark:text-red-400">{errorSummary.message}</p>
            {summaryRecoveryFile && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Server mungkin masih memproses di background — laporan akan tersimpan sebagai{" "}
                  <code>{summaryRecoveryFile}</code>.
                </p>
                <button
                  type="button"
                  className={`${secondaryButtonClass} text-xs`}
                  disabled={downloadingReport === summaryRecoveryFile}
                  onClick={() => downloadReport(summaryRecoveryFile)}
                >
                  {downloadingReport === summaryRecoveryFile ? "Mengecek..." : "Cek & unduh laporan"}
                </button>
              </div>
            )}
            {downloadError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </div>
        )}

        {summary && (
          <>
            {summary.buckets.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th className="py-2">Bucket</th>
                    <th className="py-2">Objects</th>
                    <th className="py-2">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.buckets.map((b) => (
                    <tr key={b.bucket} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="py-2">{b.bucket}</td>
                      <td className="py-2">{b.objectCount.toLocaleString()}</td>
                      <td className="py-2">{formatBytes(b.totalSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Stat label="buckets" value={summary.bucketCount} />
              <Stat label="objects" value={summary.objectCount.toLocaleString()} />
              <Stat label="total size" value={formatBytes(summary.totalSize)} />
            </div>

            {summary.reportFile && (
              <button
                type="button"
                className="mt-3 text-sm font-medium underline disabled:opacity-50"
                disabled={downloadingReport === summary.reportFile}
                onClick={() => downloadReport(summary.reportFile!)}
              >
                {downloadingReport === summary.reportFile
                  ? "Downloading..."
                  : `Re-download ${summary.reportFile}`}
              </button>
            )}
            {downloadError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-1 text-sm font-semibold">Reconciliation</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Match Object Storage against MySQL table/column file references.
        </p>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Buckets (comma-separated)
            </label>
            <input
              className={inputClass}
              placeholder="all buckets"
              value={reconBuckets}
              onChange={(e) => setReconBuckets(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Prefix</label>
            <input
              className={inputClass}
              placeholder="images/"
              value={reconPrefix}
              onChange={(e) => setReconPrefix(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
            Table / column mappings
          </label>
          <div className="space-y-2">
            {mappings.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input
                  className={inputClass}
                  placeholder="table"
                  value={m.table}
                  onChange={(e) => updateMapping(i, "table", e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="column"
                  value={m.column}
                  onChange={(e) => updateMapping(i, "column", e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="id column (default: id)"
                  value={m.idColumn}
                  onChange={(e) => updateMapping(i, "idColumn", e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md border border-red-300 px-3 text-sm text-red-600 dark:border-red-800 dark:text-red-400"
                  onClick={() => removeMapping(i)}
                  disabled={mappings.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={addMapping}>
            + Add mapping
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={loadingReconciliation}
            onClick={onRunReconciliation}
          >
            {loadingReconciliation ? "Running..." : "Run reconciliation"}
          </button>
          {loadingReconciliation && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              This can take a while for large buckets/tables.
            </span>
          )}
        </div>

        {errorReconciliation && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {errorReconciliation.message}
          </p>
        )}

        {reconciliation && (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              <Stat label="matched" value={reconciliation.summary.matchedCount.toLocaleString()} tone="ok" />
              <Stat label="missing" value={reconciliation.summary.missingCount.toLocaleString()} tone="warn" />
              <Stat label="orphan" value={reconciliation.summary.orphanCount.toLocaleString()} tone="err" />
              <Stat label="db references" value={reconciliation.summary.databaseFileCount.toLocaleString()} />
              <Stat label="storage objects" value={reconciliation.summary.storageObjectCount.toLocaleString()} />
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-medium underline disabled:opacity-50"
              disabled={downloadingReport === reconciliation.reportFile}
              onClick={() => downloadReport(reconciliation.reportFile)}
            >
              {downloadingReport === reconciliation.reportFile
                ? "Downloading..."
                : `Download ${reconciliation.reportFile}`}
            </button>
            {downloadError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-1 text-sm font-semibold">Auto reconciliation</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Enter a database name and it discovers file-reference columns from the schema itself
          (information_schema) instead of typing table/column mappings by hand. Best-effort:
          review the discovered columns in the downloaded report before trusting it fully.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Database</label>
            <input
              className={inputClass}
              placeholder="staging_lms"
              value={autoReconDatabase}
              onChange={(e) => setAutoReconDatabase(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Buckets (comma-separated)
            </label>
            <input
              className={inputClass}
              placeholder="all buckets"
              value={autoReconBuckets}
              onChange={(e) => setAutoReconBuckets(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Prefix</label>
            <input
              className={inputClass}
              placeholder="images/"
              value={autoReconPrefix}
              onChange={(e) => setAutoReconPrefix(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={buttonClass}
            disabled={loadingAutoReconciliation || !autoReconDatabase.trim()}
            onClick={onAutoReconciliation}
          >
            {loadingAutoReconciliation ? "Running..." : "Discover & reconcile"}
          </button>
        </div>

        {loadingAutoReconciliation && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-black transition-all dark:bg-white"
                style={{ width: `${autoReconciliationProgress?.percent ?? 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {autoReconciliationProgress
                ? autoReconciliationProgress.phase === "discovering"
                  ? autoReconciliationProgress.label
                  : `[${autoReconciliationProgress.phase}] ${autoReconciliationProgress.percent}% — ${autoReconciliationProgress.completed}/${autoReconciliationProgress.total} (${autoReconciliationProgress.label})`
                : "Starting..."}
            </p>
          </div>
        )}

        {errorAutoReconciliation && (
          <div className="mt-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorAutoReconciliation.message}
            </p>
            {autoReconRecoveryFile && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Server mungkin masih memproses di background — laporan akan tersimpan sebagai{" "}
                  <code>{autoReconRecoveryFile}</code>.
                </p>
                <button
                  type="button"
                  className={`${secondaryButtonClass} text-xs`}
                  disabled={downloadingReport === autoReconRecoveryFile}
                  onClick={() => downloadReport(autoReconRecoveryFile)}
                >
                  {downloadingReport === autoReconRecoveryFile ? "Mengecek..." : "Cek & unduh laporan"}
                </button>
              </div>
            )}
            {downloadError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </div>
        )}

        {autoReconciliation && (
          <>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              {autoReconciliation.mappings} column(s) discovered and checked
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Stat
                label="matched"
                value={autoReconciliation.summary.matchedCount.toLocaleString()}
                tone="ok"
              />
              <Stat
                label="missing"
                value={autoReconciliation.summary.missingCount.toLocaleString()}
                tone="warn"
              />
              <Stat
                label="orphan"
                value={autoReconciliation.summary.orphanCount.toLocaleString()}
                tone="err"
              />
              <Stat
                label="db references"
                value={autoReconciliation.summary.databaseFileCount.toLocaleString()}
              />
              <Stat
                label="storage objects"
                value={autoReconciliation.summary.storageObjectCount.toLocaleString()}
              />
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-medium underline disabled:opacity-50"
              disabled={downloadingReport === autoReconciliation.reportFile}
              onClick={() => downloadReport(autoReconciliation.reportFile)}
            >
              {downloadingReport === autoReconciliation.reportFile
                ? "Downloading..."
                : `Re-download ${autoReconciliation.reportFile}`}
            </button>
            {downloadError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "err";
}) {
  const toneClass =
    tone === "ok"
      ? "text-green-600 dark:text-green-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "err"
          ? "text-red-600 dark:text-red-400"
          : "";

  return (
    <div className="min-w-[110px] rounded-md border border-gray-200 px-4 py-2 dark:border-gray-800">
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}
