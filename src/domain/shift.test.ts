import { describe, expect, it } from "vitest";
import type { Shift } from "../types";
import { openShift, closeShift, shiftDifference, shiftSummary } from "./shift";

const base: Shift = {
  id: "s1",
  cashierId: "ayu",
  cashierName: "Ayu",
  openedAt: Date.now(),
  closedAt: null,
  openingFloat: 500000,
  closingFloat: null,
  cashTotal: 0,
  allTotal: 0,
  txCount: 0,
};

describe("openShift", () => {
  it("creates a new shift with the opening float", () => {
    const s = openShift({ id: "s2", cashierId: "bima", cashierName: "Bima", openingFloat: 300000 });
    expect(s.id).toBe("s2");
    expect(s.cashierId).toBe("bima");
    expect(s.openingFloat).toBe(300000);
    expect(s.closedAt).toBeNull();
    expect(s.cashTotal).toBe(0);
  });
});

describe("closeShift", () => {
  it("sets closing values and timestamp", () => {
    const s = closeShift({ ...base, cashTotal: 850000, allTotal: 1200000, txCount: 12 }, 870000, 850000, 1200000, 12);
    expect(s.closedAt).toBeTypeOf("number");
    expect(s.closingFloat).toBe(870000);
    expect(s.cashTotal).toBe(850000);
  });
});

describe("shiftDifference", () => {
  it("returns 0 when closing matches expected", () => {
    const s = closeShift({ ...base, openingFloat: 500000, cashTotal: 850000 }, 1350000, 850000, 0, 0);
    expect(shiftDifference(s)).toBe(0);
  });

  it("returns positive for surplus", () => {
    const s = closeShift({ ...base, openingFloat: 500000, cashTotal: 850000 }, 1400000, 850000, 0, 0);
    expect(shiftDifference(s)).toBe(50000);
  });

  it("returns negative for deficit", () => {
    const s = closeShift({ ...base, openingFloat: 500000, cashTotal: 850000 }, 1300000, 850000, 0, 0);
    expect(shiftDifference(s)).toBe(-50000);
  });
});

describe("shiftSummary", () => {
  it("formats a one-line summary of an open shift", () => {
    expect(shiftSummary(base)).toContain("Ayu");
    expect(shiftSummary(base)).toContain("Rp 500.000");
  });

  it("includes difference in a closed shift summary", () => {
    const closed = closeShift({ ...base, cashTotal: 850000 }, 1350000, 850000, 0, 0);
    const msg = shiftSummary(closed);
    expect(msg).toContain("Rp 0");
  });
});
