import { lazy, Suspense, useState } from "react";
import CartPanel from "./components/CartPanel";
import Header from "./components/Header";
import { PinModal, SettingsModal } from "./components/ManagerModals";
import PaymentModal from "./components/PaymentModal";
import ProductGrid from "./components/ProductGrid";
import ReceiptModal from "./components/ReceiptModal";
import Toasts from "./components/Toast";
import { IconCart, IconX } from "./components/icons";
import { formatIDR } from "./lib/format";
import { usePosStore } from "./store";
import type { Transaction } from "./types";

import ShiftPanel from "./components/ShiftPanel";
import HeldOrdersDrawer from "./components/HeldOrdersDrawer";
import VoidModal from "./components/VoidModal";

const HistoryView = lazy(() => import("./components/HistoryView"));
const StockView = lazy(() => import("./components/StockView"));

export default function App() {
  const {
    // Navigasi & filter
    view, setView,
    query, setQuery, category, setCategory,

    // Keranjang & pesanan
    cart, discountPct, orderType, setOrderType, table, setTable,
    qtyInCart, itemCount, totals,
    addItem, changeQty, removeItem, setItemNote, clearCart, handleDiscount,

    // Pembayaran & struk
    payOpen, openPayment, closePayment, confirmPayment,
    receiptTx, receiptFromHistory, openReceiptFromHistory, closeReceipt,
    nextInvoice,

    // Stok
    stockMap, setStock, restockOne, restockAll,

    // Kasir, PIN & zona berbahaya
    cashiers, cashierId, selectCashier,
    pin, setPin, pinReq, requestPin, closePin,
    clearHistory, resetAll,

    // Shift
    currentShift, shiftReady, openShift: handleOpenShift, closeShift: handleCloseShift,

    // Pesanan parkir
    heldOrders, heldOrdersOpen, setHeldOrdersOpen,
    parkOrder, restoreOrder, deleteHeldOrder,

    // Riwayat & ringkasan
    transactions, todayTotal, voidTransaction,

    // UI sementara
    drawerOpen, setDrawerOpen,
    settingsOpen, setSettingsOpen,
    toasts, pushToast,
  } = usePosStore();

  const [voidTx, setVoidTx] = useState<Transaction | null>(null);

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
    onNote: setItemNote,
    onPark: () => {
      const label = window.prompt("Label pesanan parkir (mis. Meja 7):", table || "");
      if (label !== null) parkOrder(label);
    },
    heldCount: heldOrders.length,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        view={view}
        onView={setView}
        cashiers={cashiers}
        cashierId={cashierId}
        onCashier={selectCashier}
        todayTotal={todayTotal}
        onSettings={() => setSettingsOpen(true)}
        shiftStatus={
          currentShift ? (
            <div className="flex items-center gap-2 rounded-full border border-pine/30 bg-pine/8 px-3 py-1.5 text-xs text-pine">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pine" />
              </span>
              <span className="font-semibold">{currentShift.cashierName}</span>
              <span className="text-ink/40">·</span>
              <span className="font-mono font-bold tabular">{formatIDR(currentShift.openingFloat)}</span>
              <span className="text-ink/40">·</span>
              <span>{currentShift.txCount} tx</span>
            </div>
          ) : undefined
        }
      />

      {/* Shift overlay */}
      <ShiftPanel
        shift={currentShift}
        onOpen={handleOpenShift}
        onClose={handleCloseShift}
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
          <Suspense fallback={<ViewLoading />}>
            <StockView
              stockMap={stockMap}
              onSetStock={setStock}
              onRestockOne={restockOne}
              onRestockAll={restockAll}
              transactions={transactions}
            />
          </Suspense>
        </main>
      )}

      {view === "riwayat" && (
        <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col overflow-hidden px-4 py-5 lg:px-6">
          <Suspense fallback={<ViewLoading />}>
            <HistoryView
              transactions={transactions}
              onPrint={openReceiptFromHistory}
              onClear={clearHistory}
              onVoid={(tx) => setVoidTx(tx)}
              notify={pushToast}
            />
          </Suspense>
        </main>
      )}

      {/* Bilah keranjang mobile */}
      {view === "kasir" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/20 bg-pine-deep p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-deep lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex w-full items-center gap-3 rounded-stamp bg-gold px-4 py-3 font-bold text-ink transition active:scale-[0.98]"
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
          onClose={closePayment}
          onConfirm={confirmPayment}
        />
      )}
      {receiptTx && (
        <ReceiptModal
          tx={receiptTx}
          onClose={closeReceipt}
          closeLabel={receiptFromHistory ? "Tutup" : "Transaksi Baru"}
          onDownloaded={() => pushToast("Struk PDF diunduh", "info")}
        />
      )}
      {pinReq && (
        <PinModal
          title={pinReq.title}
          pin={pin}
          onClose={closePin}
          onSuccess={() => {
            const fn = pinReq.onOk;
            closePin();
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

      {voidTx && (
        <VoidModal
          tx={voidTx}
          onConfirm={(reason) => {
            voidTransaction(voidTx.id, reason);
            setVoidTx(null);
          }}
          onClose={() => setVoidTx(null)}
        />
      )}

      <HeldOrdersDrawer
        orders={heldOrders}
        open={heldOrdersOpen}
        onClose={() => setHeldOrdersOpen(false)}
        onRestore={(id) => {
          restoreOrder(id);
          setHeldOrdersOpen(false);
        }}
        onDelete={deleteHeldOrder}
      />

      <Toasts toasts={toasts} />
    </div>
  );
}

function ViewLoading() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center" role="status">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-pine/15 border-t-pine"
        aria-hidden
      />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
