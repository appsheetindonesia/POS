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
import { CASHIERS, INGREDIENTS, PRODUCTS, PRODUCT_MAP } from "./data/products";
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
  DELETION_LOG_LIMIT,
  DISCOUNT_APPROVAL_PCT,
  HISTORY_LIMIT,
  INGREDIENT_RESTOCK_DEFAULT,
  SHIFT_HISTORY_LIMIT,
  MAX_HELD_ORDERS,
  MAX_STOCK,
} from "./domain/policy";
import { openShift as createShift, closeShift as finishShift, shiftDifference } from "./domain/shift";
import { isVoided, restoredStock } from "./domain/void";
import {
  computeEffectiveStockMap,
  deductIngredients,
  ingredientsForCart,
  restoredIngredients,
} from "./domain/recipe";
import { needsRefreshGuard } from "./domain/leaveGuard";
import {
  buildFlushOps,
  mergeServerData,
  type Deletion,
  type SyncOp,
} from "./domain/sync";
import { LS, load, removeAllData, save } from "./lib/storage";
import { DEFAULT_VIEW, hashForView, viewFromHash } from "./lib/routes";
import { formatIDR, isSameDay } from "./lib/format";
import { api, type DbStatus } from "./lib/api";
import { EMPTY_DB_CONFIG, validateDbConfig, type DbConfig } from "./lib/dbConfig";
import type {
  CartItem,
  CategoryFilter,
  HeldOrder,
  Ingredient,
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
  const [syncQueue, setSyncQueue] = useState<SyncOp[]>(() => load(LS.syncQueue, []));
  const [deletions, setDeletions] = useState<Deletion[]>(() => load(LS.deletions, []));
  const [stockStamp, setStockStamp] = useState<Record<string, number>>(() =>
    load(LS.stockStamp, {}),
  );
  const [ingredientMap, setIngredientMap] = useState<Record<string, Ingredient>>(() => {
    const saved = load(LS.ingredients, [] as Ingredient[]);
    // Bahan dari katalog sebagai fallback untuk id yang belum tersimpan
    const base = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
    for (const i of saved) base[i.id] = i;
    return base;
  });
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
  useEffect(() => save(LS.syncQueue, syncQueue), [syncQueue]);
  useEffect(() => save(LS.deletions, deletions), [deletions]);
  useEffect(() => save(LS.stockStamp, stockStamp), [stockStamp]);
  useEffect(
    () => save(LS.ingredients, Object.values(ingredientMap)),
    [ingredientMap],
  );

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

  // ── Antrian sinkronisasi offline ──
  // Setiap mutasi entitas tersinkron mengantri op; antrian digabungkan (LWW per key)
  // saat flush. Delete mengantri tombstone agar device lain tidak menghidupkan kembali.
  const enqueueSync = useCallback((ops: SyncOp[]) => {
    if (ops.length === 0) return;
    setSyncQueue((q) => [...q, ...ops]);
  }, []);

  /** Tulis stok + stamp LWW + antrian sync dalam satu titik. */
  const writeStock = useCallback(
    (updater: (m: Record<string, number>) => Record<string, number>, keys: string[]) => {
      const stamp = Date.now();
      setStockMap((m) => {
        const next = updater(m);
        setStockStamp((st) => {
          const nextSt = { ...st };
          for (const k of keys) nextSt[k] = stamp;
          return nextSt;
        });
        enqueueSync(keys.map((k) => ({ kind: "upsert" as const, entity: "stock" as const, key: k })));
        return next;
      });
    },
    [enqueueSync],
  );

  /** Hapus entitas: catat tombstone lokal + antrikan delete. */
  const trackDeletion = useCallback(
    (entity: SyncOp["entity"], key: string) => {
      const d: Deletion = { entity, key, deletedAt: Date.now() };
      setDeletions((prev) => [d, ...prev].slice(0, DELETION_LOG_LIMIT));
      enqueueSync([{ kind: "delete", entity, key }]);
    },
    [enqueueSync],
  );

  /** Tulis bahan (qty baru eksplisit per id) + stamp LWW + antrian sync. */
  const writeIngredients = useCallback(
    (qtyById: Record<string, number>) => {
      const stamp = Date.now();
      setIngredientMap((m) => {
        const next = { ...m };
        const ids: string[] = [];
        for (const [id, qty] of Object.entries(qtyById)) {
          const cur = m[id];
          if (!cur) continue;
          next[id] = { ...cur, qty: Math.max(0, qty), updatedAt: stamp };
          ids.push(id);
        }
        enqueueSync(ids.map((id) => ({ kind: "upsert" as const, entity: "ingredients" as const, key: id })));
        return next;
      });
    },
    [enqueueSync],
  );

  /** Set qty satu bahan secara manual (input langsung di tab Stok). */
  const setIngredientQty = useCallback(
    (id: string, value: number) => writeIngredients({ [id]: Math.max(0, value) }),
    [writeIngredients],
  );

  /** Restock satu bahan: tambah qty default di atas sisa yang ada. */
  const restockIngredient = useCallback(
    (id: string) => {
      writeIngredients({ [id]: (ingredientMap[id]?.qty ?? 0) + INGREDIENT_RESTOCK_DEFAULT });
      const name = ingredientMap[id]?.name ?? id;
      pushToast(`${name} +${INGREDIENT_RESTOCK_DEFAULT}`, "success");
    },
    [writeIngredients, ingredientMap, pushToast],
  );

  /** Restock SEMUA bahan ke stok awal katalog (dilindungi PIN di UI). */
  const restockAllIngredients = useCallback(() => {
    const stamp = Date.now();
    setIngredientMap((m) => {
      const next = { ...m };
      for (const b of INGREDIENTS) {
        next[b.id] = { ...(m[b.id] ?? b), qty: b.qty, updatedAt: stamp };
      }
      enqueueSync(INGREDIENTS.map((b) => ({ kind: "upsert" as const, entity: "ingredients" as const, key: b.id })));
      return next;
    });
    pushToast("Semua bahan diisi ulang ke stok awal", "success");
  }, [enqueueSync, pushToast]);

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

  // Stok efektif: menu ber-resep diturunkan dari bahan; tanpa resep → stok langsung.
  const ingredientQtyMap = useMemo(
    () => Object.fromEntries(Object.values(ingredientMap).map((i) => [i.id, i.qty])),
    [ingredientMap],
  );
  const effectiveStockMap = useMemo(
    () => computeEffectiveStockMap(PRODUCTS, ingredientQtyMap),
    [ingredientQtyMap],
  );

  const totals: Totals = useMemo(
    () => computeTotals(cart, discountPct, PRODUCT_MAP),
    [cart, discountPct],
  );

  const addItem = (p: Product) => {
    if (!currentShift) {
      pushToast("Buka shift dulu sebelum berjualan", "warn");
      return;
    }
    const stock = effectiveStockMap[p.id] ?? 0;
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
      const stock = effectiveStockMap[productId] ?? 0;
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
    const now = Date.now();
    const id = `held-${now}`;
    const order: HeldOrder = {
      id,
      label: label.trim() || `Pesanan ${heldOrders.length + 1}`,
      items: [...cart],
      discountPct,
      orderType,
      table,
      createdAt: now,
      updatedAt: now,
    };
    enqueueSync([{ kind: "upsert", entity: "heldOrders", key: id }]);
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
    trackDeletion("heldOrders", orderId);
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
    pushToast(`Pesanan "${order.label}" dipulihkan`, "success");
  };

  const deleteHeldOrder = (orderId: string) => {
    trackDeletion("heldOrders", orderId);
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

    // Potong bahan sesuai resep (menu ber-resep) — sumber kebenaran stok.
    const need = ingredientsForCart(cart, PRODUCT_MAP);
    if (Object.keys(need).length > 0) {
      const qtyById: Record<string, number> = {};
      for (const [id, used] of Object.entries(need)) {
        qtyById[id] = (ingredientMap[id]?.qty ?? 0) - used;
      }
      writeIngredients(qtyById);
    }
    // Menu tanpa resep tetap pakai stok langsung (legacy)
    const noRecipeItems = cart.filter((i) => !PRODUCT_MAP[i.productId]?.recipe);
    if (noRecipeItems.length > 0) {
      writeStock((m) => deductStock(m, noRecipeItems), noRecipeItems.map((i) => i.productId));
    }

    setTransactions((t) => [tx, ...t].slice(0, HISTORY_LIMIT));
    enqueueSync([{ kind: "upsert", entity: "transactions", key: tx.id }]);
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
    writeStock((m) => ({ ...m, [id]: n }), [id]);
  };

  const restockOne = (id: string) => {
    const p = PRODUCT_MAP[id];
    if (p.recipe) {
      // Menu ber-resep: restock = isi ulang seluruh bahan resepnya
      const qtyById: Record<string, number> = {};
      for (const l of p.recipe) {
        const base = INGREDIENTS.find((b) => b.id === l.ingredientId);
        qtyById[l.ingredientId] = Math.max(
          ingredientMap[l.ingredientId]?.qty ?? 0,
          base?.qty ?? 0,
        );
      }
      writeIngredients(qtyById);
      pushToast(`Bahan ${p.name} diisi ulang`, "success");
      return;
    }
    setStock(id, p.stock);
    pushToast(`Stok ${p.name} → ${p.stock}`, "info");
  };

  const restockAll = () =>
    requestPin("Isi ulang semua stok", () => {
      const fresh = initialStockMap(PRODUCTS);
      writeStock(() => fresh, Object.keys(fresh));
      // Menu ber-resep menurunkan stok dari bahan — isi ulang bahan ke nilai katalog
      const ingFresh: Record<string, number> = {};
      for (const b of INGREDIENTS) ingFresh[b.id] = b.qty;
      writeIngredients(ingFresh);
      pushToast("Semua stok & bahan diisi ulang", "success");
    });

  // ── Aksi terlindungi PIN lainnya ──────────────────────
  const voidTransaction = (txId: string, reason: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx || isVoided(tx)) {
      pushToast("Transaksi tidak dapat di-void", "warn");
      return;
    }
    requestPin(`Void ${tx.invoice} — ${formatIDR(tx.total)}`, () => {
      // Kembalikan bahan sesuai resep (void)
      const ingBack = restoredIngredients(tx.lines, PRODUCT_MAP);
      if (Object.keys(ingBack).length > 0) {
        const qtyById: Record<string, number> = {};
        for (const [id, back] of Object.entries(ingBack)) {
          qtyById[id] = (ingredientMap[id]?.qty ?? 0) + back;
        }
        writeIngredients(qtyById);
      }
      // Menu tanpa resep: kembalikan stok langsung (legacy)
      const legacyLines = tx.lines.filter((l) => l.productId && !PRODUCT_MAP[l.productId!]?.recipe);
      const restored = restoredStock(legacyLines);
      if (Object.keys(restored).length > 0) {
        writeStock(
          (m) => {
            const next = { ...m };
          for (const [pid, qty] of Object.entries(restored)) {
            next[pid] = (next[pid] ?? 0) + (qty as number);
          }
            return next;
          },
          Object.keys(restored),
        );
      }
      // Mark voided (stamp LWW naik agar menang merge)
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                voided: true,
                voidedAt: Date.now(),
                voidedBy: activeCashier.id,
                voidReason: reason,
                updatedAt: Date.now(),
              }
            : t,
        ),
      );
      enqueueSync([{ kind: "upsert", entity: "transactions", key: txId }]);
      pushToast(`${tx.invoice} di-void — stok dikembalikan`, "warn");
    });
  };

  const clearHistory = () =>
    requestPin("Hapus semua riwayat transaksi", () => {
      const now = Date.now();
      const stamps: Deletion[] = transactions.map((t) => ({
        entity: "transactions" as const,
        key: t.id,
        deletedAt: now,
      }));
      setDeletions((prev) => [...stamps, ...prev].slice(0, DELETION_LOG_LIMIT));
      enqueueSync(
        stamps.map((d) => ({ kind: "delete" as const, entity: d.entity, key: d.key })),
      );
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
    setStockStamp({});
    setIngredientMap(Object.fromEntries(INGREDIENTS.map((i) => [i.id, i])));
    setCashierId(DEFAULT_CASHIER_ID);
    setPin(DEFAULT_PIN);
    setCurrentShift(null);
    setShifts([]);
    setHeldOrders([]);
    setSyncQueue([]);
    setDeletions([]);
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
    enqueueSync([{ kind: "upsert", entity: "shifts", key: s.id }]);
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
    enqueueSync([{ kind: "upsert", entity: "shifts", key: closed.id }]);

    const diff = shiftDifference(closed);
    const diffLabel = diff === 0 ? "Tepat" : diff > 0 ? `Surplus ${formatIDR(diff)}` : `Kurang ${formatIDR(diff)}`;
    pushToast(`Shift ditutup — ${diffLabel}`, diff >= 0 ? "success" : "warn");
  };

  // ── Database PostgreSQL ────────────────────────────────
  // Ref ke state sync terkini — aksi async & efek membaca versi terbaru
  // tanpa masalah stale-closure.
  const syncStateRef = useRef({ transactions, shifts, heldOrders, stockMap, stockStamp, deletions, ingredients: Object.values(ingredientMap) });
  syncStateRef.current = { transactions, shifts, heldOrders, stockMap, stockStamp, deletions, ingredients: Object.values(ingredientMap) };
  const seqRef = useRef(seq);
  seqRef.current = seq;
  const queueRef = useRef(syncQueue);
  queueRef.current = syncQueue;
  const flushingRef = useRef(false);

  /** Terapkan hasil merge LWW ke state (array identitas stabil bila tak berubah). */
  const applyMerge = useCallback((r: ReturnType<typeof mergeServerData>) => {
    setTransactions(r.transactions);
    setShifts(r.shifts);
    setHeldOrders(r.heldOrders);
    setStockMap(r.stockMap);
    setStockStamp(r.stockStamp);
    if (r.ingredients && r.ingredients.length > 0) {
      setIngredientMap((m) => {
        const next = { ...m };
        for (const i of r.ingredients!) next[i.id] = i;
        return next;
      });
    }
    setDeletions((cur) => (cur.length === r.deletions.length ? cur : r.deletions));
    if (r.seq > seqRef.current) setSeq(r.seq);
  }, []);

  /**
   * Kirim seluruh antrian offline ke server (ops LWW per entitas).
   * Berhasil = antrian dikosongkan (op usang boleh ditolak server — LWW).
   * Gagal = antrian utuh, dicoba lagi saat koneksi kembali.
   */
  const flushQueue = useCallback(async (): Promise<boolean> => {
    const q = queueRef.current;
    if (q.length === 0) return true;
    const deletedAtOf = (entity: string, key: string) =>
      syncStateRef.current.deletions.find((d) => d.entity === entity && d.key === key)?.deletedAt;
    const wire = buildFlushOps(syncStateRef.current, q, seqRef.current).map((op) =>
      op.kind === "delete" ? { ...op, deletedAt: deletedAtOf(op.entity, op.key) ?? Date.now() } : op,
    );
    try {
      const r = await api.pushOps(wire);
      if (!r.ok) return false;
      // Buang hanya op yang dikirim (snapshot depan antrian); op baru yang
      // masuk selama flush tetap dipertahankan.
      setSyncQueue((cur) => cur.slice(q.length));
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Tarik data server dan gabungkan LWW ke lokal (dua arah konvergen). */
  const pullAndMerge = useCallback(async () => {
    const d = await api.pullData();
    applyMerge(
      mergeServerData(
        syncStateRef.current,
        { ...d, stockStamps: d.stockStamps ?? {}, deletions: d.deletions ?? [] },
        seqRef.current,
      ),
    );
  }, [applyMerge]);

  // ── Auto-sync: saat mode server aktif — flush antrean lalu merge, dipicu
  // oleh mount, event online browser, dan interval ringan. Merge no-op tidak
  // mengubah referensi array sehingga tidak memicu render/simpan ulang.
  useEffect(() => {
    if (dbConfig.storageMode !== "postgresql") return;
    let cancelled = false;
    const attempt = async () => {
      try {
        const s = await api.dbStatus();
        if (cancelled) return;
        setDbStatus(s);
        if (!s.connected) return;
        await flushQueue();
        if (cancelled) return;
        await pullAndMerge();
      } catch {
        /* offline / server mati — dicoba lagi oleh interval & event online */
      }
    };
    attempt();
    const timer = window.setInterval(attempt, 30_000);
    window.addEventListener("online", attempt);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", attempt);
    };
  }, [dbConfig.storageMode, flushQueue, pullAndMerge]);

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

  /** Sinkron dua arah manual: flush antrian → tarik & gabung LWW. */
  const syncNow = async () => {
    if (dbStatus.storageMode !== "postgresql" || !dbStatus.connected) {
      pushToast("Database belum terhubung", "warn");
      return;
    }
    setDbBusy(true);
    try {
      const flushed = await flushQueue();
      await pullAndMerge();
      const pending = queueRef.current.length;
      pushToast(
        flushed && pending === 0
          ? "Tersinkron dua arah — data lokal & server konvergen"
          : "Data server digabung (LWW) — sebagian antrean menunggu koneksi",
        flushed && pending === 0 ? "success" : "info",
      );
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Sinkronisasi gagal", "warn");
    } finally {
      setDbBusy(false);
    }
  };

  /** Tarik manual dari server (merge LWW, bukan penimpaan). */
  const pullFromServer = async () => {
    if (dbStatus.storageMode !== "postgresql" || !dbStatus.connected) {
      pushToast("Database belum terhubung", "warn");
      return;
    }
    setDbBusy(true);
    try {
      await pullAndMerge();
      pushToast("Data server digabung (LWW)", "info");
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

    // Stok & bahan baku
    stockMap: effectiveStockMap, setStock, restockOne, restockAll,
    ingredientMap: Object.values(ingredientMap), setIngredientQty,
    restockIngredient, restockAllIngredients,

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
    dbConfig, dbStatus, dbBusy, pendingSyncCount: syncQueue.length,
    testDbConnection, saveDbConfig, syncNow, pullFromServer,

    // UI sementara
    drawerOpen, setDrawerOpen,
    settingsOpen, setSettingsOpen,
    toasts, pushToast,
  };
}
