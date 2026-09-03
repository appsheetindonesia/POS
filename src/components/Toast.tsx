import type { ToastMsg } from "../types";
import { IconCheck, IconCup, IconTag } from "./icons";

const toneStyle: Record<ToastMsg["tone"], string> = {
  success: "border-moss/40 bg-pine text-milk",
  info: "border-gold/50 bg-ink text-milk",
  warn: "border-tomato/50 bg-tomato text-milk",
};

export default function Toasts({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex animate-slide-in items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold shadow-deep ${toneStyle[t.tone]}`}
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-ink">
            {t.tone === "success" ? (
              <IconCheck size={13} strokeWidth={3} />
            ) : t.tone === "warn" ? (
              <IconTag size={13} strokeWidth={2.5} />
            ) : (
              <IconCup size={13} strokeWidth={2.5} />
            )}
          </span>
          <span className="leading-snug">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
