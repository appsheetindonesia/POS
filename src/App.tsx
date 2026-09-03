import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CartPanel from "./components/CartPanel";
import Header, { type View } from "./components/Header";
import HistoryView from "./components/HistoryView";
import PaymentModal from "./components/PaymentModal";
import ProductGrid, { type CategoryFilter } from "./components/ProductGrid";
import ReceiptModal from "./components/ReceiptModal";
import Toasts from "./components/Toast";
import { IconCart, IconX } from "./components/icons";
import { CASHIER_NAME, PRODUCT_MAP, TAX_RATE } from "./data/products";
import { formatIDR, isSameDay, loadLS, saveLS } from "./lib/format";
import type { CartItem, PaymentMethod, Product, Totals, Transaction } from "./types";

const LS_CART = "senja-pos:cart";
const LS_TXS = "senja-pos:transactions";
const LS_SEQ = "senja-pos:seq";

export default function App() {
  const [view, setView] = useState<View>("kasir");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Semua");
  const [cart, setCart] = useState<CartItem[]>(() => loadLS<CartItem[]>(LS_CART, []));
  const [discountPct, setDiscountPct] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadLS<Transaction[]>(LS_TXS, []));
  const [seq, setSeq] = useState<number>(() => loadLS<number>(LS_SEQ, 1));
  const [payOpen, setPayOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptFromHistory, setReceiptFromHistory] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "success" | "info" | "warn" }[]>([]);
  const toastId = useRef(0);

  useEffect(() => saveLS(LS_CART, cart), [cart]);
  useEffect(() => saveLS(LS_TXS, transactions), [transactions]);
  useEffect(() => saveLS(LS_SEQ, seq), [seq]);

  const pushToast = useCallback((text: string, tone: "success" | "info" | "warn" = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  // ── Cart ops ──────────────────────────────────────────
  const qtyInCart = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of cart) m[it.productId] = it.qty;
    return m;
  }, [cart]);

  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const totals: Totals = useMemo(() => {
    const subtotal = cart.reduce((s, it) => s + (PRODUCT_MAP[it.productId]?.price ?? 0) * it.qty, 0);
    const discountAmt = Math.round((subtotal * discountPct) / 100);
    const tax = Math.round((subtotal - discountAmt) * TAX_RATE);
    return { subtotal, discountAmt, tax, total: subtotal - discountAmt + tax };
  }, [cart, discountPct]);

  const addItem = (p: Product) => {
    setCart((c) => {
      const ex = c.find((i) => i.productId === p.id);
      return ex
        ? c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { productId: p.id, qty: 1 }];
    });
    pushToast(`${p.emoji} ${p.name} masuk pesanan`);
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((c) =>
      c
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  };

  const removeItem = (productId: string) => {
    const p = PRODUCT_MAP[productId];
    setCart((c) => c.filter((i) => i.productId !== productId));
    pushToast(`${p?.name ?? "Item"} dihapus`, "warn");
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountPct(0);
    pushToast("Pesanan dikosongkan", "info");
  };

  // ── Payment ───────────────────────────────────────────
  const nextInvoice = `SJA-${String(seq).padStart(4, "0")}`;

  const openPayment = () => {
    if (cart.length === 0) return;
    setDrawerOpen(false);
    setPayOpen(true);
  };

  const confirmPayment = (method: PaymentMethod, cash: number | null) => {
    const tx: Transaction = {
      id: `${Date.now()}-${seq}`,
      invoice: nextInvoice,
      timestamp: Date.now(),
      cashier: CASHIER_NAME,
      lines: cart.map((it) => ({
        name: PRODUCT_MAP[it.productId].name,
        qty: it.qty,
        price: PRODUCT_MAP[it.productId].price,
      })),
      itemCount,
      subtotal: totals.subtotal,
      discountPct,
      discountAmt: totals.discountAmt,
      tax: totals.tax,
      total: totals.total,
      method,
      cash,
      change: cash !== null ? cash - totals.total : null,
    };
    setTransactions((t) => [tx, ...t]);
    setSeq((s) => s + 1);
    setCart([]);
    setDiscountPct(0);
    setPayOpen(false);
    setReceiptFromHistory(false);
    setReceiptTx(tx);
    pushToast(`Pembayaran ${method.toLowerCase()} berhasil — ${formatIDR(tx.total)}`);
  };

  const todayCount = useMemo(
    () => transactions.filter((t) => isSameDay(t.timestamp, Date.now())).length,
    [transactions],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header view={view} onView={setView} cartCount={itemCount} txCount={todayCount} />

      {view === "kasir" ? (
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 lg:grid lg:grid-cols-[1fr_375px] lg:px-8">
          <ProductGrid
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            onAdd={addItem}
            qtyInCart={qtyInCart}
          />

          {/* Cart — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-[92px] h-[calc(100vh-116px)]">
              <CartPanel
                items={cart}
                totals={totals}
                discountPct={discountPct}
                onDiscountPct={setDiscountPct}
                onQty={changeQty}
                onRemove={removeItem}
                onClear={clearCart}
                onPay={openPayment}
              />
            </div>
          </aside>
        </main>
      ) : (
        <HistoryView transactions={transactions} onOpen={(tx) => { setReceiptFromHistory(true); setReceiptTx(tx); }} />
      )}

      {/* Mobile cart bar */}
      {view === "kasir" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/20 bg-pine-deep p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-deep lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-gold px-4 py-3 font-bold text-ink transition active:scale-[0.98]"
          >
            <span className="relative">
              <IconCart size={20} strokeWidth={2.2} />
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  className="absolute -right-2.5 -top-2 grid h-5 min-w-5 animate-badge place-items-center rounded-full bg-ink px-1 font-mono text-[10px] font-bold text-gold"
                >
                  {itemCount}
                </span>
              )}
            </span>
            Lihat Pesanan
            <span className="ml-auto font-mono text-base font-bold tabular">
              {formatIDR(totals.total)}
            </span>
          </button>
        </div>
      )}

      {/* Mobile cart drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="anim-fade absolute inset-0 bg-ink/60 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[86vh] animate-pop">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute -top-12 right-4 grid h-10 w-10 place-items-center rounded-full bg-milk text-ink shadow-deep"
              aria-label="Tutup pesanan"
            >
              <IconX size={18} />
            </button>
            <CartPanel
              items={cart}
              totals={totals}
              discountPct={discountPct}
              onDiscountPct={setDiscountPct}
              onQty={changeQty}
              onRemove={removeItem}
              onClear={clearCart}
              onPay={openPayment}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {payOpen && (
        <PaymentModal
          totals={totals}
          itemCount={itemCount}
          invoice={nextInvoice}
          onClose={() => setPayOpen(false)}
          onConfirm={confirmPayment}
        />
      )}
      {receiptTx && (
        <ReceiptModal
          tx={receiptTx}
          onClose={() => setReceiptTx(null)}
          closeLabel={receiptFromHistory ? "Tutup" : "Transaksi Baru"}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}
