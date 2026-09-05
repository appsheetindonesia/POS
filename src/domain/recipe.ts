/**
 * Resep & bahan baku — logika murni (tanpa React, tanpa storage).
 *
 * Model: bahan baku (Ingredient) adalah satu-satunya angka yang disimpan.
 * Stok tiap menu ber-resep TIDAK disimpan, melainkan diturunkan dari bahan:
 *   porsi menu = min(floor(qty_bahan / qtyPerServing)) untuk seluruh resepnya.
 * Penjualan memotong bahan sesuai resep; void mengembalikannya.
 * Menu tanpa resep tetap memakai stok langsung (kompatibel mundur).
 */
import type { CartItem, Ingredient, Product, RecipeLine, SaleLine } from "../types";

/** Porsi yang bisa dibuat dari satu bahan. */
export function ingredientAvailability(
  ingredient: Ingredient,
  line: RecipeLine,
): { servings: number; belowMin: boolean } {
  if (line.qtyPerServing <= 0) return { servings: Infinity, belowMin: false };
  return {
    servings: Math.floor(Math.max(0, ingredient.qty) / line.qtyPerServing),
    belowMin: ingredient.qty < ingredient.minQty,
  };
}

/**
 * Porsi menu dari seluruh resepnya — dibatasi bahan terlemah.
 * Bahan yang tidak ada di `ingredientMap` dianggap 0 (belum pernah diisi).
 */
export function derivedServings(
  ingredients: Ingredient[],
  recipe: RecipeLine[],
): number {
  if (recipe.length === 0) return 0;
  let min = Infinity;
  for (const line of recipe) {
    const ing = ingredients.find((i) => i.id === line.ingredientId);
    const { servings } = ingredientAvailability(
      ing ?? { ...EMPTY_INGREDIENT, id: line.ingredientId },
      line,
    );
    if (servings < min) min = servings;
  }
  return min;
}

const EMPTY_INGREDIENT: Ingredient = {
  id: "",
  name: "",
  unit: "",
  qty: 0,
  minQty: 0,
};

/**
 * Peta stok efektif per produk:
 *  - ber-resep  → turunan dari bahan (satu sumber kebenaran: bahan)
 *  - tanpa resep → stok langsung dari katalog (fallback legacy)
 */
export function computeEffectiveStockMap(
  products: readonly Product[],
  ingredientQty: Record<string, number>,
): Record<string, number> {
  const list = products.map((p) => ({ id: p.id, recipe: p.recipe, stock: p.stock }));
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: Record<string, number> = {};
  for (const p of list) {
    if (p.recipe && p.recipe.length > 0) {
      const ings = p.recipe
        .map((l) => {
          const qty = ingredientQty[l.ingredientId];
          return qty === undefined ? null : ({ id: l.ingredientId, qty } as Ingredient);
        })
        .filter((x): x is Ingredient => x !== null);
      out[p.id] = derivedServings(
        ings.length === p.recipe.length
          ? ings
          : [...ings, ...missingAsZero(p.recipe, ings)],
        p.recipe,
      );
    } else {
      out[p.id] = byId.get(p.id)?.stock ?? 0;
    }
  }
  return out;
}

function missingAsZero(recipe: RecipeLine[], have: Ingredient[]): Ingredient[] {
  const haveIds = new Set(have.map((h) => h.id));
  return recipe
    .filter((l) => !haveIds.has(l.ingredientId))
    .map((l) => ({ ...EMPTY_INGREDIENT, id: l.ingredientId }));
}

/** Total kebutuhan bahan untuk seluruh isi keranjang (qtyPerServing × qty). */
export function ingredientsForCart(
  cart: CartItem[],
  productMap: Record<string, Product>,
): Record<string, number> {
  const need: Record<string, number> = {};
  for (const item of cart) {
    const recipe = productMap[item.productId]?.recipe;
    if (!recipe) continue;
    for (const line of recipe) {
      need[line.ingredientId] = (need[line.ingredientId] ?? 0) + line.qtyPerServing * item.qty;
    }
  }
  return need;
}

/** Terapkan pengurangan bahan; tidak pernah negatif. */
export function deductIngredients(
  ingredientQty: Record<string, number>,
  need: Record<string, number>,
): Record<string, number> {
  const next = { ...ingredientQty };
  for (const [id, qty] of Object.entries(need)) {
    next[id] = Math.max(0, (next[id] ?? 0) - qty);
  }
  return next;
}

/**
 * Kembalikan bahan dari transaksi yang di-void (kebalikan pengurangan).
 * Baris tanpa productId atau tanpa resep tidak menyumbang.
 */
export function restoredIngredients(
  lines: readonly SaleLine[],
  productMap: Record<string, Product>,
): Record<string, number> {
  const back: Record<string, number> = {};
  for (const line of lines) {
    if (!line.productId) continue;
    const recipe = productMap[line.productId]?.recipe;
    if (!recipe) continue;
    for (const l of recipe) {
      back[l.ingredientId] = (back[l.ingredientId] ?? 0) + l.qtyPerServing * line.qty;
    }
  }
  return back;
}

/** Label ringkas pemakaian bahan, mis. "susu 550 ml · aren 30 ml". */
export function formatIngredientUse(
  need: Record<string, number>,
  nameOf?: (id: string) => string,
): string {
  const parts = Object.entries(need).map(([id, qty]) => {
    const name = nameOf?.(id) ?? id;
    return `${name} ${qty}`;
  });
  return parts.join(" · ");
}
