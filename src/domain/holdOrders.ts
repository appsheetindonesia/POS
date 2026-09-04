import type { HeldOrder } from "../types";
import { PRODUCT_MAP } from "../data/products";
import { formatIDR } from "../lib/format";

export function heldOrderSummary(order: HeldOrder): string {
  const totalItems = order.items.reduce((s, i) => s + i.qty, 0);
  const subtotal = order.items.reduce(
    (s, i) => s + (PRODUCT_MAP[i.productId]?.price ?? 0) * i.qty,
    0,
  );
  const discountLabel = order.discountPct > 0 ? ` · ${order.discountPct}%` : "";
  return `${order.label} · ${totalItems} item · ${formatIDR(subtotal)}${discountLabel}`;
}

export function heldOrderAge(order: HeldOrder): string {
  const ms = Date.now() - order.createdAt;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} d lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  return `${hr} jam lalu`;
}
