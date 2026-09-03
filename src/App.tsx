import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CartPanel from "./components/CartPanel";
import Header, { type View } from "./components/Header";
import HistoryView from "./components/HistoryView";
import { PinModal, SettingsModal } from "./components/ManagerModals";
import PaymentModal from "./components/PaymentModal";
import ProductGrid, { type CategoryFilter } from "./components/ProductGrid";
import ReceiptModal from "./components/ReceiptModal";
import StockView from "./components/StockView";
import Toasts from "./components/Toast";
import { IconCart, IconX } from "./components/icons";
import { CASHIERS, DEFAULT_PIN, PRODUCTS, PRODUCT_MAP, TAX_RATE } from "./data/products";
import { formatIDR, isSameDay, loadLS, saveLS } from "./lib/format";
import type {
  CartItem,
  OrderType,
  PaymentMethod,
  Product,
  ToastMsg,
  Totals,
  Transaction,
} from "./types";

const LS_CART = "senja-pos:cart";
const LS_TXS = "senja-pos:transactions";
const LS_SEQ = "senja-pos:seq";
const LS_STOCK = "senja-pos:stock";
const LS_CASHIER = "senja-pos:cashier";
const LS_PIN = "senja-pos:pin";

const initialStock = () => Object.fromEntries(PRODUCTS.map((p) => [p.id, p.stock]));

export default function App() {
  const [view, setView] = useState<View>("kasir");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Semua");
  const [cart, setCart] = useState<CartItem[]>(() => loadLS<CartItem[]>(LS_CART, []));
  const [discountPct, setDiscountPct] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [table, setTable] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadLS<Transaction[]>(LS_TXS, []),
  );
  const [seq, setSeq] = useState<number>(() => loadLS<number>(LS_SEQ, 1));
  const [stockMap, setStockMap] = useState<Record<string, number>>(() => ({
    ...initialStock(),
    ...loadLS<Record<string, number>>(LS_STOCK, {}),
  }));
  const [cashierId, setCashierId] = useState<string>(() => loadLS<string>(LS_CASHIER, "ayu"));
  const [pin, setPin] = useState<string>(() => loadLS<string>(LS_PIN, DEFAULT_PIN));

  const [payOpen, setPayOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptFromHistory, setReceiptFromHistory] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinReq, setPinReq] = useState<{ title: string; onOk: () => void } | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(0);

  useEffect(() => saveLS(LS_CART, cart), [cart]);
  useEffect(() => saveLS(LS_TXS, transactions), [transactions]);
  useEffect(() => saveLS(LS_SEQ, seq), [seq]);
  useEffect(() => saveLS(LS_STOCK, stockMap), [stockMap]);
  useEffect(() => saveLS(LS_CASHIER, cashierId), [cashierId]);
  useEffect(() => saveLS(LS_PIN, pin), [pin]);

  const pushToast = useCallback((text: string, tone: ToastMsg["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  const cashier = CASHIERS.find((c) => c.id === cashierId) ?? CASHIERS[0];

  /** Minta otorisasi PIN manajer sebelum menjalankan aksi sensitif */
  const requestPin = (title: string, onOk: () => void) => setPinReq({ title, onOk });

  // ── Keranjang ─────────────────────────────────────────
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
    const stock = stockMap[p.id] ?? 0;
    if (stock <= 0) {
      pushToast(`Stok ${p.name} habis`, "warn");
      return;
    }
    if ((qtyInCart[p.id] ?? 0) >= stock) {
      pushToast(`Stok ${p.name} tinggal ${stock}`, "warn");
      return;
    }
    setCart((c) => {
      const ex = c.find((i) => i.productId === p.id);
      return ex
        ? c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { productId: p.id, qty: 1 }];
    });
    pushToast(`${p.emoji} ${p.name} masuk pesanan`);
  };

  const changeQty = (productId: string, delta: number) => {
    if (delta > 0) {
      const stock = stockMap[productId] ?? 0;
      const cur = qtyInCart[productId] ?? 0;
      if (cur + delta > stock) {
        pushToast(`Stok tinggal ${stock}`, "warn");
        return;
      }
    }
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

  /** Diskon di atas 20% wajib otorisasi manajer */
  const handleDiscount = (n: number) => {
    if (n > 20) {
      requestPin(`Diskon ${n}% — perlu otorisasi`, () => {
        setDiscountPct(n);
        pushToast(`Diskon ${n}% diterapkan`, "info");
      });
      return;
    }
    setDiscountPct(n);
  };

  // ── Pembayaran ────────────────────────────────────────
  const nextInvoice = `SJA-${String(seq).padStart(4, "0")}`;

  const openPayment = () => {
    if (cart.length === 0) return;
    setDrawerOpen(false);
    setPayOpen(true);
  };

  const confirmPayment = (method: PaymentMethod, cash: number | null) => {
    if (orderType === "Dine-in" && !table.trim()) {
      pushToast("Isi nomor meja dulu ya", "warn");
      return;
    }
    const tx: Transaction = {
      id: `${Date.now()}-${seq}`,
      invoice: nextInvoice,
      timestamp: Date.now(),
      cashierId: cashier.id,
      cashier: cashier.name,
      orderType,
      table: orderType === "Dine-in" ? table.trim() : null,
      lines: cart.map((it) => ({
        productId: it.productId,
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

    // Kurangi stok sesuai yang terjual
    setStockMap((m) => {
      const n = { ...m };
      for (const it of cart) n[it.productId] = Math.max(0, (n[it.productId] ?? 0) - it.qty);
      return n;
    });

    setTransactions((t) => [tx, ...t].slice(0, 200));
    setSeq((s) => s + 1);
    setCart([]);
    setDiscountPct(0);
    setTable("");
    setPayOpen(false);
    setReceiptFromHistory(false);
    setReceiptTx(tx);
    pushToast(`Pembayaran ${method.toLowerCase()} berhasil — ${formatIDR(tx.total)}`);
  };

  // ── Stok ──────────────────────────────────────────────
  const setStock = (id: string, value: number) =>
    setStockMap((m) => ({ ...m, [id]: Math.max(0, Math.min(999, value)) }));

  const restockOne = (id: string) => {
    const p = PRODUCT_MAP[id];
    setStock(id, p.stock);
    pushToast(`Stok ${p.name} → ${p.stock}`, "info");
  };

  const restockAll = () =>
    requestPin("Isi ulang semua stok", () => {
      setStockMap(initialStock());
      pushToast("Semua stok diisi ulang", "success");
    });

  // ── Aksi terlindungi PIN lainnya ──────────────────────
  const clearHistory = () =>
    requestPin("Hapus semua riwayat transaksi", () => {
      setTransactions([]);
      pushToast("Riwayat transaksi dihapus", "warn");
    });

  const resetAll = () => {
    [LS_CART, LS_TXS, LS_SEQ, LS_STOCK, LS_CASHIER, LS_PIN].forEach((k) =>
      localStorage.removeItem(k),
    );
    setCart([]);
    setTransactions([]);
    setSeq(1);
    setDiscountPct(0);
    setOrderType("Dine-in");
    setTable("");
    setStockMap(initialStock());
    setCashierId("ayu");
    setPin(DEFAULT_PIN);
    setSettingsOpen(false);
    pushToast("Semua data direset ke awal", "info");
  };

  const todayTotal = useMemo(
    () =>
      transactions
        .filter((t) => isSameDay(t.timestamp, Date.now()))
        .reduce((s, t) => s + t.total, 0),
    [transactions],
  );

  const cartPanelProps = {
    items: cart,
    totals,
    discountPct,
    onDiscountPct: handleDiscount,
    onQty: changeQty,
    onRemove: removeItem,
    onClear: clearCart,
    onPay: openPayment,
    orderType,
    onOrderType: setOrderType,
    table,
    onTable: setTable,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        view={view}
        onView={setView}
        cashiers={CASHIERS}
        cashierId={cashierId}
        onCashier={(id) => {
          setCashierId(id);
          pushToast(`Kasir aktif: ${CASHIERS.find((c) => c.id === id)?.name}`, "info");
        }}
        todayTotal={todayTotal}
        onSettings={() => setSettingsOpen(true)}
      />

      {view === "kasir" && (
        <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-6 overflow-hidden px-4 py-5 lg:grid lg:grid-cols-[1fr_378px] lg:px-6">
          <ProductGrid
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            onAdd={addItem}
            qtyInCart={qtyInCart}
            stockMap={stockMap}
          />
          <aside className="hidden min-h-0 lg:block">
            <CartPanel {...cartPanelProps} />
          </aside>
        </main>
      )}

      {view === "stok" && (
        <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col overflow-hidden px-4 py-5 lg:px-6">
          <StockView
            stockMap={stockMap}
            onSetStock={setStock}
            onRestockOne={restockOne}
            onRestockAll={restockAll}
            transactions={transactions}
          />
        </main>
      )}

      {view === "riwayat" && (
        <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col overflow-hidden px-4 py-5 lg:px-6">
          <HistoryView
            transactions={transactions}
            onPrint={(tx) => {
              setReceiptFromHistory(true);
              setReceiptTx(tx);
            }}
            onClear={clearHistory}
            notify={pushToast}
          />
        </main>
      )}

      {/* Bilah keranjang mobile */}
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

      {/* Drawer keranjang mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="anim-fade absolute inset-0 bg-ink/60 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[88vh] animate-pop">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute -top-12 right-4 grid h-10 w-10 place-items-center rounded-full bg-milk text-ink shadow-deep"
              aria-label="Tutup pesanan"
            >
              <IconX size={18} />
            </button>
            <CartPanel {...cartPanelProps} />
          </div>
        </div>
      )}

      {/* Modal */}
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
          onDownloaded={() => pushToast("Struk PDF diunduh", "info")}
        />
      )}
      {pinReq && (
        <PinModal
          title={pinReq.title}
          pin={pin}
          onClose={() => setPinReq(null)}
          onSuccess={() => {
            const fn = pinReq.onOk;
            setPinReq(null);
            fn();
          }}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          pin={pin}
          onChangePin={setPin}
          onResetAll={() => requestPin("Reset semua data", resetAll)}
          onClose={() => setSettingsOpen(false)}
          notify={pushToast}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}
