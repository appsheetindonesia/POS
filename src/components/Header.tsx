import { useEffect, useState } from "react";
import { CASHIER_NAME, STORE } from "../data/products";
import { dateLong, timeHMS } from "../lib/format";
import { IconHistory, IconRegister, LogoCup } from "./icons";

export type View = "kasir" | "riwayat";

interface Props {
  view: View;
  onView: (v: View) => void;
  cartCount: number;
  txCount: number;
}

export default function Header({ view, onView, cartCount, txCount }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const tab = (active: boolean) =>
    `relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
      active
        ? "bg-gold text-ink shadow-lift"
        : "text-milk/70 hover:text-milk hover:bg-milk/10"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-ink/40 bg-pine-deep text-milk shadow-deep">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <LogoCup size={38} className="shrink-0" />
          <div className="leading-none">
            <p className="font-display text-xl font-black italic tracking-tight sm:text-2xl">
              {STORE.name}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Point of Sale
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="ml-2 flex items-center gap-1 rounded-full bg-ink/30 p-1 sm:ml-6">
          <button className={tab(view === "kasir")} onClick={() => onView("kasir")}>
            <IconRegister size={16} />
            <span className="hidden sm:inline">Kasir</span>
            {cartCount > 0 && (
              <span
                key={cartCount}
                className={`grid h-5 min-w-5 animate-badge place-items-center rounded-full px-1 font-mono text-[11px] font-bold ${
                  view === "kasir" ? "bg-ink text-gold" : "bg-gold text-ink"
                }`}
              >
                {cartCount}
              </span>
            )}
          </button>
          <button className={tab(view === "riwayat")} onClick={() => onView("riwayat")}>
            <IconHistory size={16} />
            <span className="hidden sm:inline">Riwayat</span>
            {txCount > 0 && (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[11px] font-bold ${
                  view === "riwayat" ? "bg-ink text-gold" : "bg-milk/15 text-milk/80"
                }`}
              >
                {txCount}
              </span>
            )}
          </button>
        </nav>

        {/* Clock + Kasir */}
        <div className="ml-auto hidden items-center gap-5 md:flex">
          <div className="text-right leading-tight">
            <p className="font-mono text-lg font-semibold tabular text-gold">{timeHMS(now)}</p>
            <p className="text-[11px] text-milk/60">{dateLong(now)}</p>
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-milk/15 bg-ink/25 py-1.5 pl-1.5 pr-4">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold font-display text-sm font-black text-ink">
              {CASHIER_NAME[0]}
            </span>
            <div className="leading-tight">
              <p className="text-xs font-bold">{CASHIER_NAME}</p>
              <p className="text-[10px] text-milk/55">Shift Pagi · Shift 1</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
