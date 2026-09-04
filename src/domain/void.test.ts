import { describe, expect, it } from "vitest";
import type { Transaction } from "../types";
import { isVoided, voidableAmount, formatVoidLabel, restoredStock } from "./void";

const baseTx: Transaction = {
  id: "tx1",
  invoice: "SJA-0001",
  timestamp: Date.now(),
  cashierId: "ayu",
  cashier: "Ayu",
  orderType: "Dine-in",
  table: "7",
  lines: [
    { productId: "k1", name: "Es Kopi Susu Aren", qty: 2, price: 24000 },
    { productId: "n1", name: "Matcha Latte", qty: 1, price: 30000 },
  ],
  itemCount: 3,
  subtotal: 78000,
  discountPct: 0,
  discountAmt: 0,
  tax: 7800,
  total: 85800,
  method: "Tunai",
  cash: 100000,
  change: 14200,
};

const voidedTx: Transaction = {
  ...baseTx,
  voided: true,
  voidedAt: Date.now(),
  voidedBy: "bima",
  voidReason: "Pesanan salah",
};

describe("isVoided", () => {
  it("returns false for a normal transaction", () => {
    expect(isVoided(baseTx)).toBe(false);
  });

  it("returns true for a voided transaction", () => {
    expect(isVoided(voidedTx)).toBe(true);
  });
});

describe("voidableAmount", () => {
  it("returns total for a normal transaction", () => {
    expect(voidableAmount(baseTx)).toBe(85800);
  });

  it("returns 0 for a voided transaction", () => {
    expect(voidableAmount(voidedTx)).toBe(0);
  });
});

describe("formatVoidLabel", () => {
  it("includes VOID, cashier name, and reason", () => {
    const label = formatVoidLabel(voidedTx);
    expect(label).toContain("VOID");
    expect(label).toContain("Bima");
    expect(label).toContain("Pesanan salah");
  });

  it("handles missing reason gracefully", () => {
    const tx = { ...voidedTx, voidReason: undefined };
    const label = formatVoidLabel(tx);
    expect(label).toContain("VOID");
    expect(label).toContain("Bima");
  });
});

describe("restoredStock", () => {
  it("returns productId → qty map from transaction lines", () => {
    const stock = restoredStock(baseTx.lines);
    expect(stock).toEqual({ k1: 2, n1: 1 });
  });

  it("returns empty map for empty lines", () => {
    expect(restoredStock([])).toEqual({});
  });
});
