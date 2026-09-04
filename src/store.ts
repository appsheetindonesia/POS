/**
 * usePosStore — pemilik tunggal seluruh state aplikasi.
 *
 * App/komponen hanya membaca dari sini dan memanggil aksi; tidak ada
 * komponen yang memegang state bisnis. Semua persistensi ke localStorage
 * terjadi di modul ini lewat lapisan akses data `lib/storage.ts`.
 *
 * Arah data:  aksi komponen → store → domain/sales.ts (logika murni)
 *             → state baru → komponen (derivasi via useMemo).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CASHIERS, PRODUCTS, PRODUCT_MAP } from "./data/products";
import {
  buildTransaction,
  cartQuantities,
  computeTotals,
  countItems,
  deductStock,
  formatInvoice,
  initialStockMap,
} from "./domain/sales";
import {
  DEFAULT_CASHIER_ID,
  DEFAULT_PIN,
  DISCOUNT_APPROVAL_PCT,
  HISTORY_LIMIT,
  MAX_STOCK,
} from "./domain/policy";
import { LS, load, removeAllData, save } from "./lib/storage";
import { DEFAULT_VIEW, hashForView, viewFromHash } from "./lib/routes";
import { formatIDR, isSameDay } from "./lib/format";
import type {
  CartItem,
  CategoryFilter,
  OrderType,
  PaymentMethod,
  Product,
  ToastMsg,
  ToastTone,
  Totals,
  Transaction,
  View,
} from "./types";

const stockFallback = initialStockMap(PRODUCTS);

export interface PinRequest {
  title: string;
  onOk: () => void;
}

export function usePosStore() {
  // ── State persisten (baca sekali saat inisialisasi, tulis via efek di bawah) ──
  const [view, setView] = useState<View>(
    () => viewFromHash(window.location.hash) ?? DEFAULT_VIEW,
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Semua");
  const [cart, setCart] = useState<CartItem[]>(() => load(LS.cart, []));
  const [discountPct, setDiscountPct] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [table, setTable] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    load(LS.transactions, []),
  );
  const [seq, setSeq] = useState<number>(() => load(LS.seq, 1));
  const [stockMap, setStockMap] = useState<Record<string, number>>(() => ({
    ...stockFallback,
    ...load(LS.stock, {}),
  }));
  const [cashierId, setCashierId] = useState<string>(() =>
    load(LS.cashier, DEFAULT_CASHIER_ID),
  );
  const [pin, setPin] = useState<string>(() => load(LS.pin, DEFAULT_PIN));

  // ── State UI sementara ──
  const [payOpen, setPayOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptFromHistory, setReceiptFromHistory] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinReq, setPinReq] = useState<PinRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(0);

  // ── Persistensi (satu titik tulis untuk semua kunci) ──
  useEffect(() => save(LS.cart, cart), [cart]);
  useEffect(() => save(LS.transactions, transactions), [transactions]);
  useEffect(() => save(LS.seq, seq), [seq]);
  useEffect(() => save(LS.stock, stockMap), [stockMap]);
  useEffect(() => save(LS.cashier, cashierId), [cashierId]);
  useEffect(() => save(LS.pin, pin), [pin]);

  // ── Sinkronisasi view ↔ hash URL (tombol back browser) ──
  useEffect(() => {
    const target = hashForView(view);
    if (window.location.hash !== target) window.history.pushState(null, "", target);
  }, [view]);

  useEffect(() => {
    const onPop = () => setView(viewFromHash(window.location.hash) ?? DEFAULT_VIEW);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const pushToast = useCallback((text: string, tone: ToastTone = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  const activeCashier = useMemo(
    () => CASHIERS.find((c) => c.id === cashierId) ?? CASHIERS[0],
    [cashierId],
  );

  /** Minta otorisasi PIN manajer sebelum menjalankan aksi sensitif. */
  const requestPin = useCallback(
    (title: string, onOk: () => void) => setPinReq({ title, onOk }),
    [],
  );
  const closePin = useCallback(() => setPinReq(null), []);

  // ── Keranjang ─────────────────────────────────────────
  const qtyInCart = useMemo(() => cartQuantities(cart), [cart]);
  const itemCount = useMemo(() => countItems(cart), [cart]);

  const totals: Totals = useMemo(
    () => computeTotals(cart, discountPct, PRODUCT_MAP),
    [cart, discountPct],
  );

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

  /** Diskon di atas batas kebijakan wajib otorisasi manajer. */
  const handleDiscount = (n: number) => {
    if (n > DISCOUNT_APPROVAL_PCT) {
      requestPin(`Diskon ${n}% — perlu otorisasi`, () => {
        setDiscountPct(n);
        pushToast(`Diskon ${n}% diterapkan`, "info");
      });
      return;
    }
    setDiscountPct(n);
  };

  // ── Pembayaran ────────────────────────────────────────
  const nextInvoice = formatInvoice(seq);

  const openPayment = () => {
    if (cart.length === 0) return;
    setDrawerOpen(false);
    setPayOpen(true);
  };
  const closePayment = () => setPayOpen(false);

  const confirmPayment = (method: PaymentMethod, cash: number | null) => {
    if (orderType === "Dine-in" && !table.trim()) {
      pushToast("Isi nomor meja dulu ya", "warn");
      return;
    }
    const tx = buildTransaction({
      cart,
      seq,
      cashierId: activeCashier.id,
      cashierName: activeCashier.name,
      orderType,
      table,
      totals,
      discountPct,
      method,
      cash,
      productMap: PRODUCT_MAP,
    });

    // Kurangi stok sesuai yang terjual
    setStockMap((m) => deductStock(m, cart));

    setTransactions((t) => [tx, ...t].slice(0, HISTORY_LIMIT));
    setSeq((s) => s + 1);
    setCart([]);
    setDiscountPct(0);
    setTable("");
    setPayOpen(false);
    setReceiptFromHistory(false);
    setReceiptTx(tx);
    pushToast(`Pembayaran ${method.toLowerCase()} berhasil — ${formatIDR(tx.total)}`);
  };

  const openReceiptFromHistory = (tx: Transaction) => {
    setReceiptFromHistory(true);
    setReceiptTx(tx);
  };
  const closeReceipt = () => setReceiptTx(null);

  // ── Stok ──────────────────────────────────────────────
  const setStock = (id: string, value: number) => {
    const n = Math.max(0, Math.min(MAX_STOCK, value));
    setStockMap((m) => ({ ...m, [id]: n }));
  };

  const restockOne = (id: string) => {
    const p = PRODUCT_MAP[id];
    setStock(id, p.stock);
    pushToast(`Stok ${p.name} → ${p.stock}`, "info");
  };

  const restockAll = () =>
    requestPin("Isi ulang semua stok", () => {
      setStockMap(initialStockMap(PRODUCTS));
      pushToast("Semua stok diisi ulang", "success");
    });

  // ── Aksi terlindungi PIN lainnya ──────────────────────
  const clearHistory = () =>
    requestPin("Hapus semua riwayat transaksi", () => {
      setTransactions([]);
      pushToast("Riwayat transaksi dihapus", "warn");
    });

  const resetAll = () => {
    removeAllData();
    setCart([]);
    setTransactions([]);
    setSeq(1);
    setDiscountPct(0);
    setOrderType("Dine-in");
    setTable("");
    setStockMap(initialStockMap(PRODUCTS));
    setCashierId(DEFAULT_CASHIER_ID);
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

  const selectCashier = (id: string) => {
    setCashierId(id);
    pushToast(`Kasir aktif: ${CASHIERS.find((c) => c.id === id)?.name}`, "info");
  };

  return {
    // Navigasi & filter katalog
    view, setView,
    query, setQuery,
    category, setCategory,

    // Keranjang & pesanan
    cart, discountPct, orderType, setOrderType, table, setTable,
    qtyInCart, itemCount, totals,
    addItem, changeQty, removeItem, clearCart, handleDiscount,

    // Pembayaran & struk
    payOpen, openPayment, closePayment, confirmPayment,
    receiptTx, receiptFromHistory, openReceiptFromHistory, closeReceipt,
    nextInvoice,

    // Stok
    stockMap, setStock, restockOne, restockAll,

    // Kasir, PIN & zona berbahaya
    cashiers: CASHIERS, cashierId, activeCashier, selectCashier,
    pin, setPin,
    pinReq, requestPin, closePin,
    clearHistory, resetAll,

    // Riwayat & ringkasan
    transactions, todayTotal,

    // UI sementara
    drawerOpen, setDrawerOpen,
    settingsOpen, setSettingsOpen,
    toasts, pushToast,
  };
}
