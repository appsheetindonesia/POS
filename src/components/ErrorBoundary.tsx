import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Tangkap error render agar seluruh kasir tidak white-screen (C1). */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Kopi Senja] crash tertangkap:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-dvh place-items-center bg-paper p-6">
          <div className="w-full max-w-sm rounded-panel border-2 border-ink/10 bg-card p-6 text-center shadow-deep">
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-stamp bg-tomato text-3xl"
              aria-hidden
            >
              💥
            </span>
            <h1 className="mt-3 font-display text-xl font-black italic text-ink">
              Ups, ada yang tidak beres
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink/55">
              Terjadi kesalahan tak terduga. Muat ulang untuk kembali berjualan —
              data transaksi sudah aman tersimpan.
            </p>
            <pre className="mt-3 max-h-24 overflow-auto rounded-xl bg-ink/5 p-2 text-left font-mono text-[11px] text-ink/60">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full rounded-stamp bg-pine px-4 py-2.5 text-sm font-bold text-milk transition hover:bg-pine-deep"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}