import { describe, expect, it } from "vitest";
import { needsRefreshGuard } from "./leaveGuard";

const base = { cartCount: 1, payOpen: false, discountPct: 0, table: "" };

describe("needsRefreshGuard", () => {
  it("does not guard an empty cart", () => {
    expect(needsRefreshGuard({ ...base, cartCount: 0 })).toBe(false);
  });

  it("does not guard a plain cart (US-07: cart survives refresh)", () => {
    expect(needsRefreshGuard(base)).toBe(false);
  });

  it("guards while the payment modal is open with items", () => {
    expect(needsRefreshGuard({ ...base, payOpen: true })).toBe(true);
  });

  it("guards when a discount is applied to the cart", () => {
    expect(needsRefreshGuard({ ...base, discountPct: 25 })).toBe(true);
  });

  it("guards when a dine-in table number was typed", () => {
    expect(needsRefreshGuard({ ...base, table: "7" })).toBe(true);
    expect(needsRefreshGuard({ ...base, table: "  " })).toBe(false);
  });

  it("does not guard a pay modal with an empty cart", () => {
    expect(needsRefreshGuard({ ...base, cartCount: 0, payOpen: true })).toBe(false);
  });
});