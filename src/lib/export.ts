import { jsPDF } from "jspdf";
import { STORE } from "../data/products";
import type { Transaction } from "../types";
import { timeHM } from "./format";

/** Format rupiah aman untuk font bawaan jsPDF (tanpa karakter NBSP dari Intl) */
const money = (n: number) => "Rp " + n.toLocaleString("id-ID");

/**
 * Ekspor riwayat transaksi ke CSV (pemisah `;` agar langsung rapi
 * dibuka di Excel locale Indonesia, BOM UTF-8 agar aksara aman).
 */
export function downloadCsv(rows: Transaction[]) {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const head = [
    "Invoice", "Waktu", "Kasir", "Tipe Pesanan", "Meja", "Jumlah Item",
    "Detail Item", "Subtotal", "Diskon (%)", "Diskon (Rp)", "PPN (Rp)",
    "Total", "Metode", "Tunai", "Kembalian",
  ];

  const body = rows.map((t) =>
    [
      t.invoice,
      new Date(t.timestamp).toLocaleString("id-ID"),
      t.cashier,
      t.orderType ?? "-",
      t.table ?? "-",
      t.itemCount,
      t.lines.map((l) => `${l.qty}x ${l.name}`).join(" | "),
      t.subtotal,
      t.discountPct,
      t.discountAmt,
      t.tax,
      t.total,
      t.method,
      t.cash ?? "",
      t.change ?? "",
    ]
      .map(esc)
      .join(";"),
  );

  const csv = "\uFEFF" + [head.map(esc).join(";"), ...body].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `senja-pos-transaksi-${key}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Buat struk PDF selebar kertas thermal 80mm, lalu unduh. */
export function downloadReceiptPdf(tx: Transaction) {
  const W = 80;
  const M = 7;
  const R = W - M;
  const height = 82 + tx.lines.length * 11 + (tx.method === "Tunai" ? 12 : 0);
  const doc = new jsPDF({ unit: "mm", format: [W, height] });
  let y = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(STORE.name, W / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(STORE.address, W / 2, y, { align: "center" });
  y += 3.6;
  doc.text(`Telp ${STORE.phone}`, W / 2, y, { align: "center" });
  y += 4;

  const dash = () => {
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(M, y, R, y);
    doc.setLineDashPattern([], 0);
    y += 4;
  };
  const row = (a: string, b: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 8);
    doc.text(a, M, y);
    doc.text(b, R, y, { align: "right" });
    y += bold ? 5.5 : 4;
  };

  dash();
  doc.setFontSize(8);
  doc.text(tx.invoice, M, y);
  doc.text(new Date(tx.timestamp).toLocaleDateString("id-ID"), R, y, { align: "right" });
  y += 4;
  doc.text(`Kasir: ${tx.cashier}`, M, y);
  doc.text(timeHM(tx.timestamp) + " WIB", R, y, { align: "right" });
  y += 4;
  doc.text(`${tx.orderType ?? "Dine-in"}${tx.table ? ` - Meja ${tx.table}` : ""}`, M, y);
  y += 4;
  dash();

  for (const l of tx.lines) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(l.name, M, y);
    doc.text(money(l.qty * l.price), R, y, { align: "right" });
    y += 3.8;
    doc.setFont("helvetica", "normal");
    doc.text(`${l.qty} x ${money(l.price)}`, M, y);
    y += 4.2;
  }

  dash();
  row(`Subtotal (${tx.itemCount} item)`, money(tx.subtotal));
  if (tx.discountAmt > 0) row(`Diskon ${tx.discountPct}%`, "-" + money(tx.discountAmt));
  row("PPN 10%", money(tx.tax));
  y += 1;
  row("TOTAL", money(tx.total), true);
  dash();
  row("Metode", tx.method.toUpperCase());
  if (tx.cash !== null) row("Tunai", money(tx.cash));
  if (tx.change !== null) row("Kembalian", money(tx.change));
  dash();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Terima kasih! Sampai jumpa", W / 2, y, { align: "center" });
  y += 3.6;
  doc.text("di senja berikutnya.", W / 2, y, { align: "center" });
  y += 4.5;
  doc.setFontSize(7);
  doc.text(tx.invoice, W / 2, y, { align: "center" });

  doc.save(`struk-${tx.invoice}.pdf`);
}
