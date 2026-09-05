import { describe, expect, it } from "vitest";
import {
  ingredientAvailability,
  derivedServings,
  computeEffectiveStockMap,
  ingredientsForCart,
  deductIngredients,
  restoredIngredients,
  formatIngredientUse,
} from "./recipe";
import type { CartItem, Ingredient, RecipeLine } from "../types";

const ing = (id: string, qty: number, min = 0): Ingredient => ({
  id,
  name: id.toUpperCase(),
  unit: "ml",
  qty,
  minQty: min,
  updatedAt: 0,
});

const rl = (id: string, qty: number): RecipeLine => ({ ingredientId: id, qtyPerServing: qty });

const cart = (productId: string, qty = 1): CartItem => ({ productId, qty });

describe("ingredientAvailability", () => {
  it("porsi = floor(qty / qtyPerServing)", () => {
    expect(ingredientAvailability(ing("susu", 1000), rl("susu", 200)).servings).toBe(5);
  });

  it("sisa 950 dengan porsi 200 → 4 (bukan 5)", () => {
    expect(ingredientAvailability(ing("susu", 950), rl("susu", 200)).servings).toBe(4);
  });

  it("stok 0 → 0 porsi; kurang terhitung relatif minQty", () => {
    expect(ingredientAvailability(ing("susu", 0), rl("susu", 200)).servings).toBe(0);
    expect(ingredientAvailability(ing("susu", 100, 400), rl("susu", 200)).belowMin).toBe(true);
    expect(ingredientAvailability(ing("susu", 500, 400), rl("susu", 200)).belowMin).toBe(false);
  });
});

describe("derivedServings", () => {
  const recipe = [rl("susu", 200), rl("aren", 30)];

  it("bahan terlemah menentukan jumlah porsi", () => {
    // susu 1000 → 5 porsi; aren 90 → 3 porsi → min = 3
    expect(derivedServings([ing("susu", 1000), ing("aren", 90)], recipe)).toBe(3);
  });

  it("semuanya cukup → penuh", () => {
    expect(derivedServings([ing("susu", 1000), ing("aren", 300)], recipe)).toBe(5);
  });

  it("bahan habis → 0", () => {
    expect(derivedServings([ing("susu", 1000), ing("aren", 0)], recipe)).toBe(0);
  });
});

describe("computeEffectiveStockMap", () => {
  const catalog = [
    { id: "k1", stock: 0, recipe: [rl("susu", 200)] },
    { id: "k2", stock: 7, recipe: undefined },
  ] as const;

  it("menu beresep: stok turunan menggantikan stok langsung", () => {
    const map = computeEffectiveStockMap(catalog as never, { susu: 1000 });
    expect(map["k1"]).toBe(5);
    expect(map["k2"]).toBe(7); // tanpa resep → fallback stok langsung
  });

  it("bahan hilang dari map (belum pernah ditulis) dianggap 0", () => {
    const map = computeEffectiveStockMap(catalog as never, {});
    expect(map["k1"]).toBe(0);
  });
});

describe("ingredientsForCart", () => {
  const catalog = {
    k1: { id: "k1", recipe: [rl("susu", 200), rl("aren", 30)] },
    k3: { id: "k3", recipe: [rl("susu", 150)] },
  } as never;

  it("menjumlahkan kebutuhan bahan lintas item keranjang", () => {
    const need = ingredientsForCart(
      [cart("k1", 2), cart("k3", 1)] as never,
      catalog,
    );
    expect(need.susu).toBe(550); // 200×2 + 150
    expect(need.aren).toBe(60);
  });

  it("item tanpa resep tidak menyumbang", () => {
    const need = ingredientsForCart([cart("zz", 3)] as never, catalog);
    expect(Object.keys(need).length).toBe(0);
  });
});

describe("deductIngredients", () => {
  it("mengurangi dan tidak pernah negatif", () => {
    const next = deductIngredients({ susu: 500, aren: 30 }, { susu: 550, aren: 30 });
    expect(next.susu).toBe(0);
    expect(next.aren).toBe(0);
  });
});

describe("restoredIngredients", () => {
  const catalog = { k1: { id: "k1", recipe: [rl("susu", 200)] } } as never;

  it("kebalikan deduct per baris terjual", () => {
    const back = restoredIngredients(
      [{ productId: "k1", name: "Es Kopi", qty: 2, price: 24000 }] as never,
      catalog,
    );
    expect(back.susu).toBe(400);
  });

  it("item tanpa resep tidak menyumbang", () => {
    const back = restoredIngredients(
      [{ productId: "zz", name: "Lain", qty: 5, price: 1000 }] as never,
      catalog,
    );
    expect(Object.keys(back).length).toBe(0);
  });
});

describe("formatIngredientUse", () => {
  it("tampilan ringkas per bahan", () => {
    expect(formatIngredientUse({ susu: 550, aren: 60 })).toBe("susu 550 · aren 60");
  });
});
