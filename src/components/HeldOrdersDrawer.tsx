import type { HeldOrder } from "../types";
import { heldOrderSummary, heldOrderAge } from "../domain/holdOrders";
import { IconTrash, IconX } from "./icons";

interface Props {
  orders: HeldOrder[];
  open: boolean;
  onClose: () => void;
  onRestore: (orderId: string) => void;
  onDelete: (orderId: string) => void;
}

export default function HeldOrdersDrawer({ orders, open, onClose, onRestore, onDelete }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center lg:items-center">
      <div className="anim-fade absolute inset-0 bg-ink/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-panel border-2 border-ink/10 bg-card shadow-deep animate-pop lg:rounded-panel">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-display text-lg font-bold italic text-ink">
            Pesanan Parkir
            <span className="ml-2 text-sm font-normal text-mist">({orders.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink/40 transition hover:bg-ink/5 hover:text-ink"
            aria-label="Tutup"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-mist">
              Belum ada pesanan parkir
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-ink/8 bg-paper p-3 transition hover:border-pine/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{o.label}</p>
                      <p className="mt-0.5 text-xs text-mist">{heldOrderSummary(o)}</p>
                      <p className="mt-0.5 text-[10px] text-mist/60">{heldOrderAge(o)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => onRestore(o.id)}
                        className="rounded-lg bg-pine/10 px-3 py-1.5 text-xs font-bold text-pine transition hover:bg-pine/20"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => onDelete(o.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-mist transition hover:bg-tomato/10 hover:text-tomato"
                        aria-label={`Hapus ${o.label}`}
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
