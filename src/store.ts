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
  SHIFT_HISTORY_LIMIT,
  MAX_HELD_ORDERS,
  MAX_STOCK,
} from "./domain/policy";
import { openShift as createShift, closeShift as finishShift, shiftDifference } from "./domain/shift";
import { isVoided, restoredStock } from "./domain/void";
import { needsRefreshGuard } from "./domain/leaveGuard";
import { LS, load, removeAllData, save } from "./lib/storage";
import { DEFAULT_VIEW, hashForView, viewFromHash } from "./lib/routes";
import { formatIDR, isSameDay } from "./lib/format";
import { api, type DbStatus } from "./lib/api";
import { EMPTY_DB_CONFIG, validateDbConfig, type DbConfig } from "./lib/dbConfig";
import type {
  CartItem,
  CategoryFilter,
  HeldOrder,
  OrderType,
  PaymentMethod,
  Product,
  Shift,
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
  const [currentShift, setCurrentShift] = useState<Shift | null>(() =>
    load(LS.shift, null),
  );
  const [shifts, setShifts] = useState<Shift[]>(() => load(LS.shifts, []));
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => load(LS.heldOrders, []));
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false);
  const [dbConfig, setDbConfig] = useState<DbConfig>(() => load(LS.dbConfig, EMPTY_DB_CONFIG));
  const [dbStatus, setDbStatus] = useState<DbStatus>({
    source: "none",
    configured: false,
    connected: false,
    storageMode: "local",
  });
  const [dbBusy, setDbBusy] = useState(false);

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
  useEffect(() => save(LS.shift, currentShift), [currentShift]);
  useEffect(() => save(LS.shifts, shifts), [shifts]);
  useEffect(() => save(LS.heldOrders, heldOrders), [heldOrders]);
  useEffect(() => save(LS.dbConfig, dbConfig), [dbConfig]);

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

  // ── Cegah muat-ulang tak sengaja saat transaksi berjalan (C3) ──
  const guardActive = needsRefreshGuard({
    cartCount: cart.length,
    payOpen,
    discountPct,
    table,
  });

  useEffect(() => {
    if (!guardActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [guardActive]);

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
    if (!currentShift) {
      pushToast("Buka shift dulu sebelum berjualan", "warn");
      return;
    }
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

  const setItemNote = (productId: string, note: string) => {
    setCart((c) =>
      c.map((i) => (i.productId === productId ? { ...i, note: note || undefined } : i)),
    );
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountPct(0);
    pushToast("Pesanan dikosongkan", "info");
  };

  const parkOrder = (label: string) => {
    if (cart.length === 0) return;
    const id = `held-${Date.now()}`;
    const order: HeldOrder = {
      id,
      label: label.trim() || `Pesanan ${heldOrders.length + 1}`,
      items: [...cart],
      discountPct,
      orderType,
      table,
      createdAt: Date.now(),
    };
    setHeldOrders((prev) => {
      const next = [order, ...prev];
      return next.length > MAX_HELD_ORDERS ? next.slice(0, MAX_HELD_ORDERS) : next;
    });
    setCart([]);
    setDiscountPct(0);
    setTable("");
    pushToast(`Pesanan diparkir — ${label.trim() || `Pesanan ${heldOrders.length + 1}`}`, "info");
  };

  const restoreOrder = (orderId: string) => {
    const order = heldOrders.find((o) => o.id === orderId);
    if (!order) return;
    if (cart.length > 0) {
      pushToast("Kosongkan keranjang dulu sebelum restore", "warn");
      return;
    }
    setCart(order.items);
    setDiscountPct(order.discountPct);
    setOrderType(order.orderType);
    setTable(order.table);
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
    pushToast(`Pesanan "${order.label}" dipulihkan`, "success");
  };

  const deleteHeldOrder = (orderId: string) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
    pushToast("Pesanan parkir dihapus", "warn");
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
      shiftId: currentShift?.id,
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
  const voidTransaction = (txId: string, reason: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx || isVoided(tx)) {
      pushToast("Transaksi tidak dapat di-void", "warn");
      return;
    }
    requestPin(`Void ${tx.invoice} — ${formatIDR(tx.total)}`, () => {
      // Restore stock
      const restored = restoredStock(tx.lines);
      setStockMap((m) => {
        const next = { ...m };
        for (const [pid, qty] of Object.entries(restored)) {
          next[pid] = (next[pid] ?? 0) + qty;
        }
        return next;
      });
      // Mark voided
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                voided: true,
                voidedAt: Date.now(),
                voidedBy: activeCashier.id,
                voidReason: reason,
              }
            : t,
        ),
      );
      pushToast(`${tx.invoice} di-void — stok dikembalikan`, "warn");
    });
  };

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
    setCurrentShift(null);
    setShifts([]);
    setHeldOrders([]);
    setDbConfig(EMPTY_DB_CONFIG);
    setDbStatus({ source: "none", configured: false, connected: false, storageMode: "local" });
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

  // ── Shift ──────────────────────────────────────────────
  const shiftReady = currentShift !== null;

  const handleOpenShift = (openingFloat: number) => {
    const s = createShift({
      id: `${Date.now()}-${cashierId}`,
      cashierId,
      cashierName: activeCashier.name,
      openingFloat,
    });
    setCurrentShift(s);
    pushToast(`Shift dibuka — modal ${formatIDR(openingFloat)}`, "success");
  };

  const handleCloseShift = (closingFloat: number) => {
    if (!currentShift) return;
    const shiftTxs = transactions.filter((t) => t.shiftId === currentShift.id);
    const cashTxs = shiftTxs.filter((t) => t.method === "Tunai");
    const cashTotal = cashTxs.reduce((s, t) => s + (t.cash ?? 0) - (t.change ?? 0), 0);
    const allTotal = shiftTxs.reduce((s, t) => s + t.total, 0);

    const closed = finishShift(currentShift, closingFloat, cashTotal, allTotal, shiftTxs.length);
    setShifts((prev) => [closed, ...prev].slice(0, SHIFT_HISTORY_LIMIT));
    setCurrentShift(null);

    const diff = shiftDifference(closed);
    const diffLabel = diff === 0 ? "Tepat" : diff > 0 ? `Surplus ${formatIDR(diff)}` : `Kurang ${formatIDR(diff)}`;
    pushToast(`Shift ditutup — ${diffLabel}`, diff >= 0 ? "success" : "warn");
  };

  // ── Database PostgreSQL ────────────────────────────────
  useEffect(() => {
    if (dbConfig.storageMode !== "postgresql") return;
    let cancelled = false;
    api
      .dbStatus()
      .then((s) => {
        if (cancelled) return;
        setDbStatus(s);
        // Perangkat baru (lokal kosong) + server terhubung → tarik data dari Postgres
        if (s.connected && transactions.length === 0) {
          api
            .pullData()
            .then((d) => {
              if (cancelled) return;
              if (d.transactions.length > 0) setTransactions(d.transactions);
              if (Object.keys(d.stockMap).length > 0) setStockMap(d.stockMap);
              if (d.shifts.length > 0) setShifts(d.shifts);
              if (d.heldOrders.length > 0) setHeldOrders(d.heldOrders);
              if (d.seq > 1) setSeq(d.seq);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbConfig.storageMode]);

  const testDbConnection = async (cfg: DbConfig) => {
    const errs = validateDbConfig(cfg);
    if (errs.length > 0) {
      pushToast(errs.join(" · "), "warn");
      return null;
    }
    setDbBusy(true);
    try {
      const r = await api.testConnection(cfg);
      pushToast(r.message, r.ok ? "success" : "warn");
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Uji koneksi gagal";
      pushToast(msg, "warn");
      // Tetap kembalikan hasil agar pesan tampil permanen di panel, bukan hanya toast
      return { ok: false, message: msg, latencyMs: 0 };
    } finally {
      setDbBusy(false);
    }
  };

  const saveDbConfig = async (cfg: DbConfig) => {
    const errs = validateDbConfig(cfg);
    if (errs.length > 0) {
      pushToast(errs.join(" · "), "warn");
      return;
    }
    setDbBusy(true);
    try {
      const r = await api.saveConfig(cfg);
      if (r.ok) {
        setDbConfig({ ...cfg, storageMode: "postgresql" });
        setDbStatus({
          source: "file",
          configured: true,
          connected: true,
          storageMode: "postgresql",
          host: cfg.host,
          database: cfg.database,
          port: cfg.port,
        });
        pushToast(`Database aktif — ${r.message}`, "success");
      } else {
        pushToast(r.message, "warn");
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Gagal simpan konfigurasi", "warn");
    } finally {
      setDbBusy(false);
    }
  };

  const syncNow = async () => {
    if (dbStatus.storageMode !== "postgresql" || !dbStatus.connected) {
      pushToast("Database belum terhubung", "warn");
      return;
    }
    setDbBusy(true);
    try {
      const r = await api.pushSync({ transactions, stockMap, shifts, heldOrders, seq });
      if (r.ok) {
        pushToast(
          `Tersinkron: ${r.counts.transactions} transaksi, ${r.counts.stock} produk, ${r.counts.shifts} shift`,
          "success",
        );
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Sinkronisasi gagal", "warn");
    } finally {
      setDbBusy(false);
    }
  };

  const pullFromServer = async () => {
    if (dbStatus.storageMode !== "postgresql" || !dbStatus.connected) {
      pushToast("Database belum terhubung", "warn");
      return;
    }
    setDbBusy(true);
    try {
      const d = await api.pullData();
      if (d.transactions.length > 0) setTransactions(d.transactions);
      if (Object.keys(d.stockMap).length > 0) setStockMap(d.stockMap);
      if (d.shifts.length > 0) setShifts(d.shifts);
      if (d.heldOrders.length > 0) setHeldOrders(d.heldOrders);
      if (d.seq > 1) setSeq(d.seq);
      pushToast("Data diambil dari server", "info");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Gagal ambil data", "warn");
    } finally {
      setDbBusy(false);
    }
  };

  return {
    // Navigasi & filter katalog
    view, setView,
    query, setQuery,
    category, setCategory,

    // Keranjang & pesanan
    cart, discountPct, orderType, setOrderType, table, setTable,
    qtyInCart, itemCount, totals,
    addItem, changeQty, removeItem, setItemNote, clearCart, handleDiscount,
    parkOrder, restoreOrder, deleteHeldOrder,

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
    transactions, todayTotal, voidTransaction,

    // Shift
    currentShift, shifts, shiftReady, openShift: handleOpenShift, closeShift: handleCloseShift,

    // Pesanan parkir
    heldOrders, heldOrdersOpen, setHeldOrdersOpen,

    // Database PostgreSQL
    dbConfig, dbStatus, dbBusy,
    testDbConnection, saveDbConfig, syncNow, pullFromServer,

    // UI sementara
    drawerOpen, setDrawerOpen,
    settingsOpen, setSettingsOpen,
    toasts, pushToast,
  };
}
