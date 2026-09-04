import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, hashForView, viewFromHash } from "./routes";

describe("viewFromHash", () => {
  it("maps every valid hash to its view", () => {
    expect(viewFromHash("#/kasir")).toBe("kasir");
    expect(viewFromHash("#/stok")).toBe("stok");
    expect(viewFromHash("#/riwayat")).toBe("riwayat");
  });

  it("returns null for empty, unknown, or malformed hashes", () => {
    expect(viewFromHash("")).toBeNull();
    expect(viewFromHash("#/laporan")).toBeNull();
    expect(viewFromHash("#riwayat")).toBeNull();
    expect(viewFromHash("/riwayat")).toBeNull();
  });
});

describe("hashForView", () => {
  it("formats the hash for a view", () => {
    expect(hashForView("riwayat")).toBe("#/riwayat");
    expect(hashForView(DEFAULT_VIEW)).toBe("#/kasir");
  });
});
