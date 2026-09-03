import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CASHIERS } from "../data/products";
import { downloadCsv } from "../lib/export";
import { dateShort, formatIDR, formatIDRCompact, isSameDay, timeHM } from "../lib/format";
import type { OrderType, Transaction } from "../types";
import { IconDownload, IconPrinter, IconTrash } from "./icons";

interface Props {
  transactions: Transaction[];
  onPrint: (tx: Transaction) => void;
  onClear: () => void;
  notify: (text: string, tone?: "success" | "info" | "warn") => void;
}

const CARD = "rounded-card border-2 border-ink/8 bg-card p-4 shadow-sm";

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-milk/15 bg-ink px-3 py-1.5 font-mono text-xs font-bold text-milk shadow-deep">
      {label !== undefined && <span className="text-milk/60">{label} · </span>}
      {formatIDR(payload[0].value)}
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-milk/15 bg-ink px-3 py-1.5 font-mono text-xs font-bold text-milk shadow-deep">
      {payload[0].name}: {payload[0].value} nota
    </div>
  );
};

const METHOD_COLORS: Record<string, string> = {
  Tunai: "#F0A82D",
  QRIS: "#3F7D61",
  "Kartu Debit": "#D1502C",
};

export default function HistoryView({ transactions, onPrint, onClear, notify }: Props) {
  const [filter, setFilter] = useState<"Semua" | OrderType>("Semua");
  const now = Date.now();

  const today = useMemo(() => transactions.filter((t) => isSameDay(t.timestamp, now)), [transactions, now]);
  const todayRevenue = today.reduce((s, t) => s + t.total, 0);
  const todayItems = today.reduce((s, t) => s + t.itemCount, 0);
  const avg = today.length ? Math.round(todayRevenue / today.length) : 0;

  const peakHour = useMemo(() => {
    const counts = new Array(24).fill(0) as number[];
    today.forEach((t) => counts[new Date(t.timestamp).getHours()]++);
    const max = Math.max(...counts);
    if (!max) return null;
    const h = counts.indexOf(max);
    return `${String(h).padStart(2, "0")}.00–${String((h + 1) % 24).padStart(2, "0")}.00`;
  }, [today]);

  const topMethod = useMemo(() => {
    const m: Record<string, number> = {};
    today.forEach((t) => (m[t.method] = (m[t.method] ?? 0) + 1));
    const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return best ? `${best[0]} · ${best[1]} nota` : null;
  }, [today]);

  const hourly = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const h = i + 7;
        return {
          h: String(h),
          v: today.filter((t) => new Date(t.timestamp).getHours() === h).reduce((s, t) => s + t.total, 0),
        };
      }),
    [today],
  );

  const weekly = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = now - (6 - i) * 86400000;
        return {
          d: dateShort(d),
          v: transactions.filter((t) => isSameDay(t.timestamp, d)).reduce((s, t) => s + t.total, 0),
          isToday: i === 6,
        };
      }),
    [transactions, now],
  );

  const methods = useMemo(
    () =>
      (["Tunai", "QRIS", "Kartu Debit"] as const)
        .map((m) => ({ name: m, value: today.filter((t) => t.method === m).length }))
        .filter((m) => m.value > 0),
    [today],
  );

  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const t of transactions) {
      for (const l of t.lines) {
        const key = l.productId ?? l.name;
        const cur = m.get(key) ?? { name: l.name, qty: 0, revenue: 0 };
        m.set(key, { name: l.name, qty: cur.qty + l.qty, revenue: cur.revenue + l.qty * l.price });
      }
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [transactions]);
  const maxTop = topProducts[0]?.qty ?? 1;

  const filtered = transactions.filter(
    (t) => filter === "Semua" || (t.orderType ?? "Dine-in") === filter,
  );

  const cashierColor = (id?: string) => CASHIERS.find((c) => c.id === id)?.color ?? "#E4E9DC";

  const exportCsv = () => {
    if (!transactions.length) return notify("Belum ada transaksi untuk diekspor", "warn");
    downloadCsv(transactions);
    notify("CSV berhasil diunduh", "success");
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-ink/6 text-5xl" aria-hidden>
          🧾
        </span>
        <p className="mt-5 font-display text-2xl font-black italic text-ink">Belum ada transaksi</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/55">
          Selesaikan penjualan pertama dari layar <b>Kasir</b> — riwayat, grafik pendapatan,
          dan ekspor CSV akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-8">
      {/* Kepala */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-black italic text-ink lg:text-3xl">
            Riwayat & Laporan
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            {transactions.length} transaksi tersimpan · {today.length} hari ini
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-stamp bg-pine px-4 py-2.5 text-sm font-bold text-milk shadow-lift transition hover:bg-pine-deep active:scale-[0.97]"
          >
            <IconDownload size={16} strokeWidth={2.4} />
            Ekspor CSV
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-2 rounded-stamp border-2 border-tomato/40 bg-card px-4 py-2.5 text-sm font-bold text-tomato transition hover:bg-tomato hover:text-milk active:scale-[0.97]"
          >
            <IconTrash size={16} />
            Hapus
          </button>
        </div>
      </div>

      {/* Statistik asimetris: satu angka dominan + kartu satelit */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="relative overflow-hidden rounded-card border-2 border-pine-deep bg-pine-deep p-5 text-milk shadow-deep">
          <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-gold/15 blur-2xl" aria-hidden />
          <div className="panel-texture pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-milk/50">
              Pendapatan hari ini
            </p>
            <p
              key={todayRevenue}
              className="mt-1.5 animate-badge font-display text-[40px] font-black italic leading-none text-gold tabular lg:text-[54px]"
            >
              {formatIDR(todayRevenue)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-milk/65">
              <span>
                <b className="font-mono text-sm text-milk tabular">{today.length}</b> nota
              </span>
              <span className="h-3 w-px bg-milk/20" aria-hidden />
              <span>
                <b className="font-mono text-sm text-milk tabular">{todayItems}</b> item terjual
              </span>
              <span className="h-3 w-px bg-milk/20" aria-hidden />
              <span>
                rata-rata <b className="font-mono text-sm text-gold tabular">{formatIDR(avg)}</b>/nota
              </span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-ink/8 overflow-hidden rounded-card border-2 border-ink/8 bg-card shadow-sm">
          {[
            { k: "Jam tersibuk", v: peakHour ?? "—" },
            { k: "Metode utama", v: topMethod ?? "—" },
            { k: "Transaksi tersimpan", v: `${transactions.length} nota` },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-mist">{r.k}</span>
              <span className="font-mono text-sm font-bold text-ink tabular">{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grafik baris 1 */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className={`${CARD} xl:col-span-2`}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold italic text-ink">Pendapatan per Jam</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-mist">Hari ini · 07–22</span>
          </div>
          <div className="relative mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0A82D" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F0A82D" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(20 35 28 / 0.08)" vertical={false} />
                <XAxis dataKey="h" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8FA697" }} interval={2} />
                <YAxis
                  tickFormatter={(v: number) => formatIDRCompact(v).replace("Rp ", "")}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tick={{ fontSize: 10, fill: "#8FA697" }}
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "#F0A82D", strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="v" stroke="#C07D10" strokeWidth={2.5} fill="url(#goldFill)" />
              </AreaChart>
            </ResponsiveContainer>
            {todayRevenue === 0 && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="rounded-full border border-ink/10 bg-paper/85 px-4 py-2 text-xs font-semibold text-ink/55">
                  Belum ada penjualan hari ini
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold italic text-ink">Metode Pembayaran</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-mist">Hari ini</span>
          </div>
          {methods.length === 0 ? (
            <p className="mt-10 text-center text-xs font-semibold text-ink/45">Belum ada data hari ini.</p>
          ) : (
            <>
              <div className="relative mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methods}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={4}
                      cornerRadius={4}
                      strokeWidth={0}
                    >
                      {methods.map((m) => (
                        <Cell key={m.name} fill={METHOD_COLORS[m.name]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="font-mono text-xl font-bold text-ink tabular">{today.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-mist">nota</p>
                  </div>
                </div>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {methods.map((m) => (
                  <li key={m.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-ink/70">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: METHOD_COLORS[m.name] }} />
                      {m.name}
                    </span>
                    <span className="font-mono font-bold text-ink tabular">{m.value} nota</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Grafik baris 2 */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className={`${CARD} xl:col-span-2`}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold italic text-ink">7 Hari Terakhir</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-mist">
              Total {formatIDRCompact(weekly.reduce((s, w) => s + w.v, 0))}
            </span>
          </div>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(20 35 28 / 0.08)" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8FA697" }} />
                <YAxis
                  tickFormatter={(v: number) => formatIDRCompact(v).replace("Rp ", "")}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tick={{ fontSize: 10, fill: "#8FA697" }}
                />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgb(20 35 28 / 0.05)" }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {weekly.map((w) => (
                    <Cell key={w.d} fill={w.isToday ? "#F0A82D" : "#1E4D3B"} fillOpacity={w.isToday ? 1 : 0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold italic text-ink">Produk Terlaris</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-mist">Semua waktu</span>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {topProducts.map((tp, i) => (
              <li key={tp.name} className="flex items-center gap-3">
                <span className="w-5 text-center font-display text-lg font-black italic text-mist">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-ink">{tp.name}</p>
                    <p className="shrink-0 font-mono text-xs font-bold text-ink/60 tabular">
                      {tp.qty} pcs · {formatIDRCompact(tp.revenue)}
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pine to-gold transition-all duration-700"
                      style={{ width: `${Math.max(8, (tp.qty / maxTop) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Buku transaksi */}
      <div className={`${CARD} mt-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold italic text-ink">Buku Transaksi</h3>
          <div className="flex gap-1.5">
            {(["Semua", "Dine-in", "Takeaway"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filter === f ? "bg-pine text-milk shadow-sm" : "bg-ink/6 text-ink/55 hover:bg-ink/10 hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-8 pb-4 text-center text-sm font-semibold text-ink/45">
            Tidak ada transaksi {filter.toLowerCase()}.
          </p>
        ) : (
          <ul className="mt-2">
            {filtered.map((t, i) => (
              <li
                key={t.id}
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                className="group flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl px-3 py-3 transition-colors hover:bg-ink/4"
              >
                <span className="w-24 font-mono text-sm font-bold text-ink">{t.invoice}</span>
                <span className="w-24">
                  <span className="block font-mono text-xs font-bold text-ink tabular">{timeHM(t.timestamp)}</span>
                  <span className="block text-[10px] font-semibold text-mist">{dateShort(t.timestamp)}</span>
                </span>
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-black text-ink"
                  style={{ background: cashierColor(t.cashierId) }}
                  title={`Kasir ${t.cashier}`}
                >
                  {t.cashier.slice(0, 1)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    (t.orderType ?? "Dine-in") === "Dine-in"
                      ? "bg-pine/12 text-pine"
                      : "bg-gold/25 text-gold-deep"
                  }`}
                >
                  {t.orderType ?? "Dine-in"}
                  {t.table ? ` · M${t.table}` : ""}
                </span>
                <span className="hidden text-[11px] font-semibold text-mist md:inline">
                  {t.method} · {t.itemCount} item
                </span>
                <span className="ml-auto font-mono text-sm font-bold text-ink tabular">
                  {formatIDR(t.total)}
                </span>
                <button
                  onClick={() => onPrint(t)}
                  className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink/10 text-ink/45 transition hover:border-pine hover:bg-pine hover:text-milk active:scale-90"
                  aria-label={`Lihat struk ${t.invoice}`}
                  title="Lihat struk"
                >
                  <IconPrinter size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
