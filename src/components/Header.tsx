import { useState, type ComponentType } from "react";
import { formatIDRCompact } from "../lib/format";
import type { Cashier, View } from "../types";
import {
  IconBox,
  IconCheck,
  IconChevronDown,
  IconHistory,
  IconRegister,
  IconSettings,
  LogoCup,
} from "./icons";

const TABS: { id: View; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "kasir", label: "Kasir", icon: IconRegister },
  { id: "stok", label: "Stok", icon: IconBox },
  { id: "riwayat", label: "Riwayat", icon: IconHistory },
];

interface Props {
  view: View;
  onView: (v: View) => void;
  cashiers: Cashier[];
  cashierId: string;
  onCashier: (id: string) => void;
  todayTotal: number;
  onSettings: () => void;
}

export default function Header({ view, onView, cashiers, cashierId, onCashier, todayTotal, onSettings }: Props) {
  const [open, setOpen] = useState(false);
  const cashier = cashiers.find((c) => c.id === cashierId) ?? cashiers[0];
  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="relative z-40 border-b border-ink/10 bg-paper/92 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 lg:px-6">
        {/* Merek */}
        <div className="flex items-center gap-2.5">
          <LogoCup size={34} />
          <div className="leading-none">
            <p className="font-display text-lg font-black italic tracking-tight text-ink">
              Kopi Senja
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-mist">
              {todayLabel} · Meja Kasir 01
            </p>
          </div>
        </div>

        {/* Navigasi */}
        <nav className="order-3 w-full sm:order-none sm:mx-auto sm:w-auto" aria-label="Navigasi utama">
          <div className="flex gap-1 rounded-full bg-ink/6 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onView(t.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 sm:flex-none ${
                    active
                      ? "bg-pine text-milk shadow-lift"
                      : "text-ink/55 hover:bg-ink/5 hover:text-ink"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} />
                  <span className="hidden min-[430px]:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Kluster kanan */}
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {/* Omzet hari ini */}
          <div
            className="hidden items-center gap-2 rounded-full border border-gold/40 bg-gold/12 px-3 py-1.5 lg:flex"
            title="Total pendapatan hari ini"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-deep opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-deep" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-deep/70">
              Omzet hari ini
            </span>
            <span key={todayTotal} className="animate-badge font-mono text-sm font-bold text-gold-deep tabular">
              {formatIDRCompact(todayTotal)}
            </span>
          </div>

          {/* Pemilih kasir */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border-2 border-ink/10 bg-card py-1.5 pl-1.5 pr-2.5 transition hover:border-pine/40"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-black text-ink"
                style={{ background: cashier.color }}
              >
                {cashier.name.slice(0, 1)}
              </span>
              <span className="hidden text-sm font-bold text-ink sm:inline">{cashier.name}</span>
              <IconChevronDown
                size={14}
                className={`text-ink/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-52 animate-drop rounded-card border-2 border-ink/8 bg-card p-1.5 shadow-deep"
                  role="listbox"
                >
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-mist">
                    Ganti Kasir
                  </p>
                  {cashiers.map((c) => {
                    const active = c.id === cashierId;
                    return (
                      <button
                        key={c.id}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onCashier(c.id);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                          active ? "bg-pine/10" : "hover:bg-ink/5"
                        }`}
                      >
                        <span
                          className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-black text-ink"
                          style={{ background: c.color }}
                        >
                          {c.name.slice(0, 1)}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-ink">{c.name}</span>
                        {active && <IconCheck size={15} strokeWidth={2.6} className="text-pine" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pengaturan */}
          <button
            onClick={onSettings}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink/10 bg-card text-ink/55 transition-all duration-300 hover:rotate-45 hover:border-pine/40 hover:text-pine"
            aria-label="Pengaturan"
            title="Pengaturan"
          >
            <IconSettings size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
