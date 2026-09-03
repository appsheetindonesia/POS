import { CATEGORIES, CATEGORY_TINT, PRODUCTS } from "../data/products";
import { formatIDR } from "../lib/format";
import type { Category, Product } from "../types";
import { IconPlus, IconSearch, IconX } from "./icons";

export type CategoryFilter = Category | "Semua";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  category: CategoryFilter;
  onCategory: (c: CategoryFilter) => void;
  onAdd: (p: Product) => void;
  qtyInCart: Record<string, number>;
}

export default function ProductGrid({ query, onQuery, category, onCategory, onAdd, qtyInCart }: Props) {
  const list = PRODUCTS.filter((p) => {
    const matchCat = category === "Semua" || p.category === category;
    const q = query.trim().toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const chips: { name: CategoryFilter; emoji: string; count: number }[] = [
    { name: "Semua", emoji: "🧾", count: PRODUCTS.length },
    ...CATEGORIES.map((c) => ({
      name: c.name as CategoryFilter,
      emoji: c.emoji,
      count: PRODUCTS.filter((p) => p.category === c.name).length,
    })),
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* Search + filter */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="group relative flex flex-1 items-center">
          <span className="pointer-events-none absolute left-4 text-mist transition-colors group-focus-within:text-pine">
            <IconSearch size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Cari menu… mis. kopi aren, croissant"
            className="w-full rounded-2xl border-2 border-ink/10 bg-card py-3 pl-11 pr-10 text-sm font-medium text-ink shadow-sm outline-none transition-all placeholder:text-ink/35 focus:border-pine focus:shadow-lift"
          />
          {query && (
            <button
              onClick={() => onQuery("")}
              className="absolute right-3 grid h-6 w-6 place-items-center rounded-full bg-ink/8 text-ink/60 transition hover:bg-ink/15 hover:text-ink"
              aria-label="Hapus pencarian"
            >
              <IconX size={13} />
            </button>
          )}
        </label>

        <div className="scroll-slim flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {chips.map((c) => {
            const active = category === c.name;
            return (
              <button
                key={c.name}
                onClick={() => onCategory(c.name)}
                className={`flex shrink-0 items-center gap-2 rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "border-pine bg-pine text-milk shadow-lift"
                    : "border-ink/10 bg-card text-ink/70 hover:-translate-y-0.5 hover:border-pine/40 hover:text-ink"
                }`}
              >
                <span aria-hidden>{c.emoji}</span>
                {c.name}
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    active ? "bg-gold text-ink" : "bg-ink/8 text-ink/55"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="mt-16 flex animate-fade-up flex-col items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-ink/6 text-4xl" aria-hidden>
            🔍
          </span>
          <p className="mt-4 font-display text-xl font-bold text-ink">Tidak ada menu cocok</p>
          <p className="mt-1 max-w-xs text-sm text-ink/55">
            Coba kata kunci lain atau ganti kategori — “{query}” tidak ditemukan di {category}.
          </p>
          <button
            onClick={() => {
              onQuery("");
              onCategory("Semua");
            }}
            className="mt-4 rounded-full bg-pine px-5 py-2.5 text-sm font-bold text-milk transition hover:bg-pine-deep active:scale-95"
          >
            Atur ulang filter
          </button>
        </div>
      ) : (
        <div className="scroll-slim mt-5 grid flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-y-auto pb-28 pr-1 sm:grid-cols-3 lg:pb-6 2xl:grid-cols-4">
          {list.map((p, i) => {
            const tint = CATEGORY_TINT[p.category];
            const inCart = qtyInCart[p.id] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => onAdd(p)}
                style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
                className="group relative flex animate-fade-up flex-col overflow-hidden rounded-2xl border-2 border-ink/8 bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-pine/35 hover:shadow-lift active:translate-y-0 active:scale-[0.98]"
              >
                {/* Tile emoji */}
                <div className={`relative grid h-24 place-items-center ${tint.bg} sm:h-28`}>
                  <span
                    className="text-5xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-115"
                    aria-hidden
                  >
                    {p.emoji}
                  </span>
                  {p.popular && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink shadow-sm">
                      ★ Terlaris
                    </span>
                  )}
                  {inCart > 0 && (
                    <span
                      key={inCart}
                      className="absolute right-2.5 top-2.5 grid h-6 min-w-6 animate-badge place-items-center rounded-full bg-pine px-1.5 font-mono text-[11px] font-bold text-milk shadow-sm"
                    >
                      ×{inCart}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tint.chip}`}>
                    {p.category}
                  </span>
                  <h3 className="mt-1.5 text-sm font-bold leading-snug text-ink">{p.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink/50">{p.desc}</p>

                  <div className="mt-auto flex items-end justify-between pt-3">
                    <span className="font-mono text-sm font-bold text-pine tabular">
                      {formatIDR(p.price)}
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-pine text-milk shadow-sm transition-all duration-200 group-hover:bg-gold group-hover:text-ink group-active:scale-90">
                      <IconPlus size={16} strokeWidth={2.6} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
