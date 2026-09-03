import { useEffect, useMemo, useState } from "react";
import { formatIDR, formatNum, parseDigits } from "../lib/format";
import type { PaymentMethod, Totals } from "../types";
import { IconArrowRight, IconBanknote, IconCard, IconCheck, IconQr, IconX } from "./icons";

interface Props {
  totals: Totals;
  itemCount: number;
  invoice: string;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, cash: number | null) => void;
}

const METHODS: { name: PaymentMethod; label: string; icon: typeof IconBanknote }[] = [
  { name: "Tunai", label: "Tunai", icon: IconBanknote },
  { name: "QRIS", label: "QRIS", icon: IconQr },
  { name: "Kartu Debit", label: "Kartu Debit", icon: IconCard },
];

/** Kode QR semu yang deterministik dari invoice + total */
function PseudoQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let s = 2166136261;
    for (const c of seed) {
      s ^= c.charCodeAt(0);
      s = Math.imul(s, 16777619);
    }
    const rand = () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100) / 100;
    };
    const N = 21;
    const g: boolean[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => rand() > 0.52));
    const finder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 7; j++) {
          const edge = i === 0 || i === 6 || j === 0 || j === 6;
          const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          g[r + i][c + j] = edge || core;
        }
      for (let i = -1; i <= 7; i++)
        for (let j = -1; j <= 7; j++) {
          const rr = r + i, cc = c + j;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && (i === -1 || i === 7 || j === -1 || j === 7))
            g[rr][cc] = false;
        }
    };
    finder(0, 0); finder(0, 14); finder(14, 0);
    for (let i = 8; i < 13; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
    return g;
  }, [seed]);

  return (
    <svg viewBox="0 0 21 21" className="h-40 w-40 rounded-lg bg-white p-2 shadow-inner" shapeRendering="crispEdges">
      {cells.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#14231C" /> : null,
        ),
      )}
    </svg>
  );
}

export default function PaymentModal({ totals, itemCount, invoice, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("Tunai");
  const [cash, setCash] = useState(0);
  const [cashText, setCashText] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const quicks = useMemo(() => {
    const t = totals.total;
    const opts = [t, Math.ceil(t / 20000) * 20000, Math.ceil(t / 50000) * 50000, Math.ceil(t / 100000) * 100000];
    return [...new Set(opts)].slice(0, 4);
  }, [totals.total]);

  const change = cash - totals.total;
  const canConfirm = method !== "Tunai" || cash >= totals.total;

  const setCashValue = (n: number) => {
    setCash(n);
    setCashText(n > 0 ? formatNum(n) : "");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="w-full max-w-md animate-pop overflow-hidden rounded-3xl bg-card shadow-deep"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Head */}
        <div className="panel-texture flex items-start justify-between bg-pine-deep px-6 pb-5 pt-5 text-milk">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Pembayaran</p>
            <h2 className="mt-1 font-display text-2xl font-black italic">
              {formatIDR(totals.total)}
            </h2>
            <p className="mt-0.5 text-xs text-milk/55">
              {itemCount} item · {invoice}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-milk/15 p-2 text-milk/60 transition hover:bg-milk/10 hover:text-milk"
            aria-label="Tutup"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* Methods */}
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Ic = m.icon;
              const active = method === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => setMethod(m.name)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-xs font-bold transition-all duration-200 ${
                    active
                      ? "border-pine bg-pine text-milk shadow-lift"
                      : "border-ink/10 bg-paper text-ink/60 hover:-translate-y-0.5 hover:border-pine/40 hover:text-ink"
                  }`}
                >
                  <Ic size={20} strokeWidth={1.8} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Tunai */}
          {method === "Tunai" && (
            <div className="mt-5 animate-drop">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/50">
                Uang diterima
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border-2 border-ink/10 bg-paper px-4 py-3 transition-all focus-within:border-pine focus-within:shadow-lift">
                <span className="font-mono text-lg font-bold text-ink/40">Rp</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={cashText}
                  onChange={(e) => setCashValue(parseDigits(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent font-mono text-2xl font-bold text-ink outline-none placeholder:text-ink/25 tabular"
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {quicks.map((q) => (
                  <button
                    key={q}
                    onClick={() => setCashValue(q)}
                    className={`rounded-full border-2 px-3 py-1.5 font-mono text-xs font-bold transition-all active:scale-95 tabular ${
                      cash === q
                        ? "border-gold bg-gold text-ink"
                        : "border-ink/10 bg-card text-ink/65 hover:border-gold/60 hover:text-ink"
                    }`}
                  >
                    {q === totals.total ? "Uang pas" : formatIDR(q)}
                  </button>
                ))}
              </div>

              <div
                className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
                  cash === 0
                    ? "bg-ink/5 text-ink/45"
                    : change >= 0
                      ? "bg-pine/10 text-pine"
                      : "bg-tomato/10 text-tomato"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  {cash === 0 ? "Masukkan nominal uang" : change >= 0 ? "Kembalian" : "Uang kurang"}
                  {change >= 0 && cash > 0 && <IconCheck size={15} strokeWidth={3} />}
                </span>
                <span className="font-mono text-lg font-bold tabular">
                  {cash === 0 ? "—" : formatIDR(Math.abs(change))}
                </span>
              </div>
            </div>
          )}

          {/* QRIS */}
          {method === "QRIS" && (
            <div className="mt-5 flex animate-drop flex-col items-center rounded-2xl border-2 border-dashed border-pine/30 bg-pine/5 px-4 py-5 text-center">
              <PseudoQr seed={invoice + totals.total} />
              <p className="mt-3 text-sm font-bold text-pine">Scan dengan aplikasi apa pun</p>
              <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-ink/55">
                Minta pelanggan memindai kode, lalu pastikan notifikasi pembayaran berhasil masuk.
              </p>
              <span className="mt-3 rounded-full bg-pine px-3 py-1 font-mono text-xs font-bold text-milk tabular">
                {formatIDR(totals.total)}
              </span>
            </div>
          )}

          {/* Kartu */}
          {method === "Kartu Debit" && (
            <div className="mt-5 animate-drop rounded-2xl border-2 border-dashed border-pine/30 bg-pine/5 px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-pine text-milk">
                  <IconCard size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-bold text-pine">Mesin EDC siap</p>
                  <p className="text-xs text-ink/55">Terminal #04 · BCA / Mandiri / BNI</p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-pine/12 px-2.5 py-1 text-[11px] font-bold text-pine">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pine" />
                  Online
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/55">
                Masukkan atau tempelkan kartu pelanggan, lalu konfirmasi setelah struk EDC keluar.
              </p>
            </div>
          )}

          <button
            onClick={() => canConfirm && onConfirm(method, method === "Tunai" ? cash : null)}
            disabled={!canConfirm}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3.5 font-bold text-ink shadow-lift transition-all duration-200 enabled:hover:bg-[#f7b644] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <IconCheck size={18} strokeWidth={2.6} />
            Konfirmasi Pembayaran
            <IconArrowRight size={16} className="transition-transform group-enabled:group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
