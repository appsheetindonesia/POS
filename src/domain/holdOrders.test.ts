import { describe, expect, it } from "vitest";
import type { HeldOrder } from "../types";
import { heldOrderSummary, heldOrderAge } from "./holdOrders";

const base: HeldOrder = {
  id: "h1",
  label: "Meja 7",
  items: [
    { productId: "k1", qty: 2, note: "kurang gula" },
    { productId: "n1", qty: 1 },
  ],
  discountPct: 0,
  orderType: "Dine-in",
  table: "7",
  createdAt: Date.now() - 120_000, // 2 minutes ago
};

describe("heldOrderSummary", () => {
  it("includes label, item count, and total", () => {
    const s = heldOrderSummary(base);
    expect(s).toContain("Meja 7");
    expect(s).toContain("3"); // 2 + 1
  });

  it("includes discount when nonzero", () => {
    const s = heldOrderSummary({ ...base, discountPct: 10 });
    expect(s).toContain("10%");
  });
});

describe("heldOrderAge", () => {
  it("returns seconds for recent orders", () => {
    const o = { ...base, createdAt: Date.now() - 30_000 };
    expect(heldOrderAge(o)).toContain("d");
  });

  it("returns minutes for older orders", () => {
    expect(heldOrderAge(base)).toContain("mnt");
  });

  it("returns hours for very old orders", () => {
    const o = { ...base, createdAt: Date.now() - 3_600_000 };
    expect(heldOrderAge(o)).toContain("jam");
  });
});
