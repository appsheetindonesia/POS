import { useMemo, useState } from "react";
import { formatIDR, formatIDRCompact, isSameDay, timeHM } from "../lib/format";
import type { PaymentMethod, Transaction } from "../types";
import { IconBanknote, IconCard, IconChart, IconQr, IconReceipt } from "./icons";

interface Props {
  transactions: Transaction[];
  onOpen: (tx: Transaction) => void;
}

type Filter = "today" | "all";

const METHOD_META: Record<PaymentMethod, { color: string; bar: string; icon: typeof IconBanknote }> = {
  Tunai: { color: "text-gold-deep", bar: "bg-gold", icon: IconBanknote },
  QRIS: { color: "text-pine", bar: "bg-pine-soft", icon: IconQr },
  "Kartu Debit": { color: "text-tomato", bar: "bg-tomato/80", icon: IconCard },
};

export default function HistoryView({ transactions, onOpen }: Props) {
  const [filter, setFilter] = useState<Filter>("today");
  const now = Date.now();

  const filtered = useMemo(() => {
    const list = filter === "today" ? transactions.filter((t) => isSameDay(t.timestamp, now)) : transactions;
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, filter, now]);

  const revenue = filtered.reduce((s, t) => s + t.total, 0);
  const itemsSold = filtered.reduce((s, t) => s + t.itemCount, 0);
  const avg = filtered.length ? Math.round(revenue / filtered.length) : 0;

  // Pendapatan per jam (untuk sparkline hari ini)
  const hourly = useMemo(() => {
    const today = transactions.filter((t) => isSameDay(t.timestamp, now));
    const buckets = Array.from({ length: 16 }, (_, i) => ({ hour: i + 7, total: 0 }));
    for (const t of today) {
      const h = new Date(t.timestamp).getHours();
      const b = buckets.find((x) => x.hour === h);
      if (b) b.total += t.total;
    }
    return buckets;
  }, [transactions, now]);
  const maxHour = Math.max(...hourly.map((h) => h.total), 1);

  // Komposisi metode pembayaran
  const mix = useMemo(() => {
    const m: Record<PaymentMethod, number> = { Tunai: 0, QRIS: 0, "Kartu Debit": 0 };
    for (const t of filtered) m[t.method] += t.total;
    return (Object.keys(m) as PaymentMethod[]).map((k) => ({
      method: k,
      total: m[k],
      pct: revenue ? Math.round((m[k] / revenue) * 100) : 0,
    }));
  }, [filtered, revenue]);

  return (
    <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-deep">Laporan Kasir</p>
          <h1 className="mt-1 font-display text-3xl font-black italic tracking-tight sm:text-4xl">
            Riwayat Transaksi
          </h1>
        </div>
        <div className="flex rounded-full border-2 border-ink/10 bg-card p-1">
          {(["today", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                filter === f ? "bg-pine text-milk shadow-lift" : "text-ink/55 hover:text-ink"
              }`}
            >
              {f === "today" ? "Hari Ini" : "Semua"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="panel-texture relative overflow-hidden rounded-3xl bg-pine-deep p-5 text-milk shadow-deep">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-milk/50">
                Pendapatan {filter === "today" ? "Hari Ini" : "Total"}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold text-gold tabular sm:text-4xl">
                {formatIDR(revenue)}
              </p>
              <p className="mt-1 text-xs text-milk/55">
                {filtered.length} transaksi tercatat
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold text-ink">
              <IconChart size={20} strokeWidth={2.2} />
            </span>
          </div>
          {/* Sparkline per jam */}
          <div className="mt-4">
            <div className="flex h-14 items-end gap-1">
              {hourly.map((h) => (
                <div
                  key={h.hour}
                  title={`${h.hour}:00 — ${formatIDR(h.total)}`}
                  className="group relative flex-1 rounded-t-sm bg-milk/12 transition-colors hover:bg-gold"
                  style={{ height: `${Math.max((h.total / maxHour) * 100, h.total > 0 ? 12 : 4)}%` }}
                >
                  {h.total > 0 && <span className="absolute inset-x-0 top-0 h-1 rounded-t-sm bg-gold/70" />}
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-milk/40 tabular">
              <span>07:00</span>
              <span>12:00</span>
              <span>17:00</span>
              <span>22:00</span>
            </div>
          </div>
        </div>

        {[
          { label: "Transaksi", value: String(filtered.length), sub: filter === "today" ? "struk tercetak hari ini" : "total struk" },
          { label: "Item Terjual", value: String(itemsSold), sub: "cup & piring keluar" },
          { label: "Rata-rata / Struk", value: formatIDRCompact(avg), sub: "nilai per transaksi" },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="flex animate-fade-up flex-col justify-between rounded-3xl border-2 border-ink/8 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-pine/30 hover:shadow-lift"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/45">{s.label}</p>
            <p className="mt-3 font-mono text-3xl font-bold text-pine tabular">{s.value}</p>
            <p className="mt-2 text-xs text-ink/50">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Metode pembayaran */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="rounded-3xl border-2 border-ink/8 bg-card p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/45">Komposisi Pembayaran</p>
          <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-ink/6">
            {mix.map((m) => (
              <div
                key={m.method}
                className={`${METHOD_META[m.method].bar} transition-all duration-700 ease-out`}
                style={{ width: `${m.pct}%` }}
                title={`${m.method} ${m.pct}%`}
              />
            ))}
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {mix.map((m) => {
              const Ic = METHOD_META[m.method].icon;
              return (
                <li key={m.method} className="flex items-center gap-2.5 text-sm">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg bg-ink/5 ${METHOD_META[m.method].color}`}>
                    <Ic size={15} />
                  </span>
                  <span className="font-semibold text-ink/75">{m.method}</span>
                  <span className="ml-auto font-mono text-sm font-bold tabular">{formatIDR(m.total)}</span>
                  <span className="w-10 text-right font-mono text-xs text-ink/45 tabular">{m.pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Ledger */}
        <div className="rounded-3xl border-2 border-ink/8 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/45">Struk Terbaru</p>
            <span className="rounded-full bg-pine/10 px-2.5 py-0.5 font-mono text-xs font-bold text-pine tabular">
              {filtered.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-ink/5 text-ink/35">
                <IconReceipt size={28} strokeWidth={1.6} />
              </span>
              <p className="mt-3 font-display text-lg font-bold">
                {filter === "today" ? "Belum ada transaksi hari ini" : "Belum ada transaksi"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-ink/50">
                {filter === "today"
                  ? "Buka tab Kasir dan buat penjualan pertama hari ini — struknya akan muncul di sini."
                  : "Semua transaksi yang diselesaikan akan tersimpan otomatis di perangkat ini."}
              </p>
            </div>
          ) : (
            <ul className="scroll-slim max-h-[380px] divide-y divide-ink/6 overflow-y-auto">
              {filtered.map((t, i) => {
                const meta = METHOD_META[t.method];
                return (
                  <li key={t.id} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} className="animate-fade-up">
                    <button
                      onClick={() => onOpen(t)}
                      className="group flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors hover:bg-pine/5"
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/5 ${meta.color} transition-transform group-hover:scale-110`}>
                        <meta.icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-sm font-bold tabular">{t.invoice}</span>
                          <span className="truncate text-xs text-ink/50">
                            {t.lines[0]?.name}
                            {t.lines.length > 1 ? ` +${t.lines.length - 1} lainnya` : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-ink/40 tabular">
                          {timeHM(t.timestamp)} · {t.itemCount} item · {t.method}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold tabular">{formatIDR(t.total)}</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink/10 text-ink/40 transition-all group-hover:border-pine group-hover:bg-pine group-hover:text-milk">
                        <IconReceipt size={15} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
