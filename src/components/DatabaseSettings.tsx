import { useState } from "react";
import { api } from "../lib/api";
import type { DbStatus } from "../lib/api";
import {
  EMPTY_DB_CONFIG,
  maskConnectionString,
  parseDatabaseUrl,
  type DbConfig,
} from "../lib/dbConfig";
import { IconAlert, IconCheck, IconDatabase, IconRefresh } from "./icons";

interface Props {
  dbConfig: DbConfig;
  dbStatus: DbStatus;
  dbBusy: boolean;
  onTest: (cfg: DbConfig) => Promise<{ ok: boolean; message: string; latencyMs: number } | null>;
  onSave: (cfg: DbConfig) => Promise<void>;
  onSyncNow: () => Promise<void>;
  onPull: () => Promise<void>;
}

const inputCls =
  "w-full rounded-stamp border-2 border-ink/10 bg-paper px-3 py-2 text-sm font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink/30 focus:border-pine";

export default function DatabaseSettings({
  dbConfig,
  dbStatus,
  dbBusy,
  onTest,
  onSave,
  onSyncNow,
  onPull,
}: Props) {
  const [mode, setMode] = useState<"local" | "postgresql">(
    dbConfig.storageMode ?? "local",
  );
  const [host, setHost] = useState(dbConfig.host || "localhost");
  const [port, setPort] = useState(dbConfig.port || "5432");
  const [database, setDatabase] = useState(dbConfig.database || "pos_db");
  const [username, setUsername] = useState(dbConfig.username || "postgres");
  const [password, setPassword] = useState(dbConfig.password ?? "");
  const [ssl, setSsl] = useState(dbConfig.ssl ?? false);
  const [urlDraft, setUrlDraft] = useState("");
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs: number;
  } | null>(null);

  const cfg: DbConfig = { storageMode: "postgresql", host, port, database, username, password, ssl };

  const fillFromUrl = () => {
    const parsed = parseDatabaseUrl(urlDraft.trim());
    if (!parsed) return;
    setHost(parsed.host);
    setPort(parsed.port);
    setDatabase(parsed.database);
    setUsername(parsed.username);
    setPassword(parsed.password);
    setSsl(parsed.ssl);
    setMode("postgresql");
  };

  const handleTest = async () => {
    const r = await onTest(cfg);
    if (r) setTestResult(r);
  };

  const connected = dbStatus.connected && dbStatus.storageMode === "postgresql";

  return (
    <div className="mt-6">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-mist">
        <IconDatabase size={13} /> Database PostgreSQL
      </p>

      {/* Mode penyimpanan */}
      <div className="mt-2.5 flex gap-1.5">
        {(
          [
            ["local", "Lokal (perangkat ini)"],
            ["postgresql", "PostgreSQL (server)"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-stamp px-3 py-2 text-xs font-bold transition ${
              mode === m
                ? "bg-pine text-milk shadow-lift"
                : "border-2 border-ink/10 bg-card text-ink/50 hover:bg-ink/5"
            }`}
            aria-pressed={mode === m}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status */}
      <div
        className={`mt-2.5 flex items-center gap-2 rounded-card border-2 px-3 py-2.5 text-xs font-semibold ${
          connected
            ? "border-moss/30 bg-moss/10 text-ink"
            : "border-ink/10 bg-ink/4 text-ink/60"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            connected ? "bg-moss" : "bg-ink/30"
          }`}
        />
        <span className="flex-1">
          {mode === "local"
            ? "Semua data disimpan di browser ini."
            : connected
              ? `Terhubung ke ${dbStatus.database}@${dbStatus.host}:${dbStatus.port}${dbStatus.source === "env" ? " (via DATABASE_URL)" : ""}`
              : "Belum terhubung ke server database."}
        </span>
      </div>

      {mode === "postgresql" && (
        <>
          {/* Isi cepat dari DATABASE_URL */}
          <div className="mt-2.5 flex gap-2">
            <input
              className={inputCls}
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="Tempel DATABASE_URL untuk isi otomatis (opsional)"
              aria-label="DATABASE_URL"
            />
            <button
              onClick={fillFromUrl}
              className="shrink-0 rounded-stamp bg-ink/6 px-3 py-2 text-xs font-bold text-ink/70 transition hover:bg-ink/10"
            >
              Isi
            </button>
          </div>

          {/* Form koneksi */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mist">Host</span>
              <input className={inputCls} value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mist">Port</span>
              <input className={inputCls} value={port} onChange={(e) => setPort(e.target.value)} placeholder="5432" inputMode="numeric" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mist">Database</span>
              <input className={inputCls} value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="pos_db" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mist">Username</span>
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="postgres" autoComplete="off" />
            </label>
            <label className="block col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mist">Password</span>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </label>
            <label className="col-span-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink/70">
              <input
                type="checkbox"
                checked={ssl}
                onChange={(e) => setSsl(e.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Gunakan SSL (mode sslmode=require — untuk koneksi remote)
            </label>
          </div>

          {/* Hasil uji koneksi */}
          {testResult && (
            <p
              className={`mt-2.5 flex items-start gap-1.5 rounded-card border-2 px-3 py-2 text-xs font-semibold ${
                testResult.ok
                  ? "border-moss/30 bg-moss/10 text-ink"
                  : "border-tomato/30 bg-tomato/8 text-tomato"
              }`}
            >
              {testResult.ok ? <IconCheck size={13} className="mt-0.5 shrink-0" /> : <IconAlert size={13} className="mt-0.5 shrink-0" />}
              <span>
                {testResult.message}
                {testResult.ok && (
                  <span className="ml-1 font-mono text-ink/45">· {testResult.latencyMs} ms</span>
                )}
              </span>
            </p>
          )}

          {/* Tombol aksi */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleTest}
              disabled={dbBusy}
              className="flex-1 rounded-stamp border-2 border-pine/40 bg-card px-4 py-2.5 text-sm font-bold text-pine transition hover:bg-pine/8 active:scale-[0.98] disabled:opacity-50"
            >
              {dbBusy ? "Memeriksa…" : "Uji Koneksi"}
            </button>
            <button
              onClick={() => onSave(cfg)}
              disabled={dbBusy}
              className="flex-1 rounded-stamp bg-pine px-4 py-2.5 text-sm font-bold text-milk transition hover:bg-pine-deep active:scale-[0.98] disabled:opacity-50"
            >
              {dbBusy ? "Menyimpan…" : "Simpan & Aktifkan"}
            </button>
          </div>

          {/* Sinkronisasi */}
          {connected && (
            <div className="mt-3 rounded-card border-2 border-ink/8 bg-ink/3 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist">
                Sinkronisasi
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onSyncNow}
                  disabled={dbBusy}
                  className="flex items-center justify-center gap-1.5 flex-1 rounded-stamp bg-gold px-3 py-2 text-xs font-bold text-ink transition hover:bg-gold-deep active:scale-[0.98] disabled:opacity-50"
                >
                  <IconRefresh size={13} /> Sinkronkan Sekarang
                </button>
                <button
                  onClick={onPull}
                  disabled={dbBusy}
                  className="flex-1 rounded-stamp border-2 border-ink/10 bg-card px-3 py-2 text-xs font-bold text-ink/60 transition hover:bg-ink/5 active:scale-[0.98] disabled:opacity-50"
                >
                  Ambil dari Server
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
                Data di perangkat baru otomatis dipulihkan dari server saat
                riwayat lokal masih kosong. {dbConfig.host && `Terkonfigurasi: ${maskConnectionString(dbConfig)}`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}