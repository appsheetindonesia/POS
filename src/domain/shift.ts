import type { Shift } from "../types";

export function openShift(opts: {
  id: string;
  cashierId: string;
  cashierName: string;
  openingFloat: number;
}): Shift {
  return {
    id: opts.id,
    cashierId: opts.cashierId,
    cashierName: opts.cashierName,
    openedAt: Date.now(),
    closedAt: null,
    openingFloat: opts.openingFloat,
    closingFloat: null,
    cashTotal: 0,
    allTotal: 0,
    txCount: 0,
  };
}

export function closeShift(
  shift: Shift,
  closingFloat: number,
  cashTotal: number,
  allTotal: number,
  txCount: number,
): Shift {
  return {
    ...shift,
    closedAt: Date.now(),
    closingFloat,
    cashTotal,
    allTotal,
    txCount,
  };
}

/** Selisih: uang di tangan − (modal + total tunai). Positif = surplus, negatif = kurang. */
export function shiftDifference(shift: Shift): number {
  if (shift.closingFloat === null) return 0;
  return shift.closingFloat - shift.openingFloat - shift.cashTotal;
}

/** Ringkasan satu baris untuk toast / label shift. */
export function shiftSummary(shift: Shift): string {
  const durasi = shift.closedAt
    ? `${Math.round((shift.closedAt - shift.openedAt) / 60000)} mnt`
    : "berjalan";
  const selisih = shift.closedAt !== null ? ` · Selisih ${formatRp(shiftDifference(shift))}` : "";
  return `${shift.cashierName} · ${formatRp(shift.openingFloat)} · ${shift.txCount} tx · ${durasi}${selisih}`;
}

function formatRp(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString("id-ID");
  return n < 0 ? `-Rp ${s}` : `Rp ${s}`;
}
