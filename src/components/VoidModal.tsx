import { useState } from "react";
import type { Transaction } from "../types";
import { formatIDR } from "../lib/format";
import { IconX } from "./icons";

interface Props {
  tx: Transaction;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export default function VoidModal({ tx, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-panel border-2 border-ink/10 bg-card p-6 text-center shadow-deep">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-stamp bg-tomato text-3xl" aria-hidden>
          ⚠️
        </span>
        <h2 className="mt-3 font-display text-xl font-black italic text-ink">
          Void Transaksi
        </h2>
        <p className="mt-1 text-sm text-ink/55">
          {tx.invoice} — {formatIDR(tx.total)}
        </p>
        <p className="mt-1 text-xs text-mist">
          Stok akan dikembalikan. Butuh PIN manajer.
        </p>

        <div className="mt-4 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-mist">
            Alasan Void
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="mis. Pesanan salah"
            maxLength={100}
            className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-paper px-3 py-2.5 text-sm text-ink outline-none transition focus:border-tomato"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-stamp border-2 border-ink/10 bg-card px-4 py-2.5 text-sm font-bold text-ink/55 transition hover:bg-ink/5"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-stamp bg-tomato px-4 py-2.5 text-sm font-bold text-milk transition hover:bg-tomato-deep"
          >
            Void
          </button>
        </div>
      </div>
    </div>
  );
}
