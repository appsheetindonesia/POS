import type { Transaction, SaleLine } from "../types";

export function isVoided(tx: Transaction): boolean {
  return tx.voided === true;
}

export function voidableAmount(tx: Transaction): number {
  return isVoided(tx) ? 0 : tx.total;
}

export function formatVoidLabel(tx: Transaction): string {
  const cashier = tx.voidedBy ? `oleh ${tx.voidedBy.charAt(0).toUpperCase() + tx.voidedBy.slice(1)}` : "";
  const reason = tx.voidReason ? ` · ${tx.voidReason}` : "";
  return `VOID ${cashier}${reason}`;
}

export function restoredStock(lines: readonly SaleLine[]): Record<string, number> {
  const stock: Record<string, number> = {};
  for (const line of lines) {
    if (line.productId) {
      stock[line.productId] = (stock[line.productId] ?? 0) + line.qty;
    }
  }
  return stock;
}
