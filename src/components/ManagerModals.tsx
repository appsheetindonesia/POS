import { useEffect, useRef, useState } from "react";
import { DEFAULT_PIN } from "../data/products";
import { IconAlert, IconBackspace, IconCheck, IconLock, IconX } from "./icons";

/* ─────────────────────────────────────────────────────────
   PinModal — otorisasi manajer dengan keypad numerik
────────────────────────────────────────────────────────── */
interface PinModalProps {
  /** Aksi yang sedang dimintakan otorisasi, mis. "Diskon 25%" */
  title: string;
  pin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function PinModal({ title, pin, onSuccess, onClose }: PinModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [ok, setOk] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (/^[0-9]$/.test(e.key) && !busy.current) press(e.key);
      if (e.key === "Backspace") setValue((v) => v.slice(0, -1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, error]);

  const press = (d: string) => {
    if (busy.current || error) return;
    const v = (value + d).slice(0, 4);
    setValue(v);
    if (v.length === 4) {
      if (v === pin) {
        busy.current = true;
        setOk(true);
        setTimeout(onSuccess, 420);
      } else {
        setError(true);
        setTimeout(() => {
          setValue("");
          setError(false);
        }, 550);
      }
    }
  };

  const dot = (i: number) =>
    `h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
      ok
        ? "scale-110 border-moss bg-moss"
        : error
          ? "border-tomato bg-tomato"
          : i < value.length
            ? "scale-110 border-gold bg-gold"
            : "border-ink/25 bg-transparent"
    }`;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/75 p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs animate-pop rounded-panel border-2 border-ink/10 bg-card p-6 text-center shadow-deep"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Otorisasi manajer"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-ink/40 transition hover:bg-ink/8 hover:text-ink"
          aria-label="Batal"
        >
          <IconX size={16} />
        </button>

        <span
          className={`mx-auto grid h-12 w-12 place-items-center rounded-stamp transition-colors ${
            ok ? "bg-moss text-milk" : error ? "bg-tomato text-milk" : "bg-gold text-ink"
          }`}
        >
          {ok ? <IconCheck size={22} strokeWidth={2.6} /> : <IconLock size={22} />}
        </span>

        <h3 className="mt-3 font-display text-lg font-black italic text-ink">Otorisasi Manajer</h3>
        <p className="mt-0.5 text-xs font-semibold text-ink/50">
          {ok ? "PIN benar — melanjutkan…" : title}
        </p>

        {/* Indikator digit */}
        <div className={`mt-5 flex justify-center gap-3 ${error ? "animate-shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={dot(i)} />
          ))}
        </div>
        <p
          className={`mt-2 h-4 text-[11px] font-bold ${
            error ? "text-tomato" : ok ? "text-moss" : "text-transparent"
          }`}
        >
          {error ? "PIN salah — coba lagi" : ok ? "Berhasil" : "•"}
        </p>

        {/* Keypad */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => (
            <button
              key={k}
              onClick={() =>
                k === "C" ? setValue("") : k === "⌫" ? setValue((v) => v.slice(0, -1)) : press(k)
              }
              className={`flex h-12 items-center justify-center rounded-stamp font-mono text-lg font-bold transition-all duration-150 active:scale-90 ${
                k === "C" || k === "⌫"
                  ? "bg-ink/6 text-ink/55 hover:bg-tomato/15 hover:text-tomato"
                  : "bg-ink/6 text-ink hover:bg-gold hover:text-ink"
              }`}
              aria-label={k === "⌫" ? "Hapus digit" : k === "C" ? "Bersihkan" : `Angka ${k}`}
            >
              {k === "⌫" ? <IconBackspace size={20} /> : k}
            </button>
          ))}
        </div>

        {pin === DEFAULT_PIN && !ok && (
          <p className="mt-4 text-[11px] font-semibold text-ink/40">
            PIN demo: <span className="font-mono font-bold text-gold-deep">2468</span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SettingsModal — ubah PIN & zona berbahaya
────────────────────────────────────────────────────────── */
interface SettingsModalProps {
  pin: string;
  onChangePin: (next: string) => void;
  onResetAll: () => void;
  onClose: () => void;
  notify: (text: string, tone?: "success" | "info" | "warn") => void;
}

export function SettingsModal({ pin, onChangePin, onResetAll, onClose, notify }: SettingsModalProps) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const digits = (s: string) => s.replace(/[^\d]/g, "").slice(0, 6);

  const submitPin = () => {
    if (cur !== pin) return setErr("PIN saat ini salah.");
    if (next.length < 4) return setErr("PIN baru minimal 4 digit.");
    if (next !== confirm) return setErr("Konfirmasi PIN tidak cocok.");
    onChangePin(next);
    setCur("");
    setNext("");
    setConfirm("");
    setErr("");
    notify("PIN manajer diperbarui", "success");
  };

  const inputCls =
    "w-full rounded-stamp border-2 border-ink/10 bg-paper px-3 py-2 font-mono text-sm font-bold tracking-[0.3em] text-ink outline-none transition placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-ink/30 focus:border-pine";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="w-full max-w-sm animate-pop rounded-panel border-2 border-ink/10 bg-card p-6 shadow-deep"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black italic text-ink">Pengaturan</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink/40 transition hover:bg-ink/8 hover:text-ink"
            aria-label="Tutup pengaturan"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Ubah PIN */}
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mist">PIN Manajer</p>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <input className={inputCls} type="password" inputMode="numeric" placeholder="PIN saat ini" value={cur} onChange={(e) => setCur(digits(e.target.value))} />
            <input className={inputCls} type="password" inputMode="numeric" placeholder="PIN baru (min. 4 digit)" value={next} onChange={(e) => setNext(digits(e.target.value))} />
            <input className={inputCls} type="password" inputMode="numeric" placeholder="Ulangi PIN baru" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} />
          </div>
          {err && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-tomato">
              <IconAlert size={13} /> {err}
            </p>
          )}
          <button
            onClick={submitPin}
            className="mt-3 w-full rounded-stamp bg-pine px-4 py-2.5 text-sm font-bold text-milk transition hover:bg-pine-deep active:scale-[0.98]"
          >
            Simpan PIN Baru
          </button>
        </div>

        {/* Zona berbahaya */}
        <div className="mt-6 rounded-card border-2 border-tomato/30 bg-tomato/8 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">
            <IconAlert size={13} /> Zona Berbahaya
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/60">
            Menghapus <b>semua</b> transaksi, stok, keranjang, dan mengembalikan PIN ke default.
            Tidak bisa dibatalkan.
          </p>
          <button
            onClick={onResetAll}
            className="mt-3 w-full rounded-stamp bg-tomato px-4 py-2.5 text-sm font-bold text-milk transition hover:bg-[#b8431f] active:scale-[0.98]"
          >
            Reset Semua Data
          </button>
        </div>
      </div>
    </div>
  );
}
