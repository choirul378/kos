import type { Payment } from "./db/repo";

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pad = (n: number) => String(n).padStart(2, "0");

export function thousands(v: number) {
  return Math.round(Math.abs(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
export function rupiah(v: number) {
  return (v < 0 ? "-" : "") + "Rp " + thousands(v);
}
export function parseAmount(s: string) {
  return parseInt(s.replace(/\D/g, ""), 10) || 0;
}
export function amountInput(s: string) {
  const n = parseAmount(s);
  return n ? thousands(n) : "";
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const currentPeriod = () => todayISO().slice(0, 7);
export function periodLabel(p: string) {
  const [y, m] = p.split("-").map(Number);
  return `${MONTHS[m - 1] ?? ""} ${y}`;
}
export function shiftPeriod(p: string, delta: number) {
  const [y, m] = p.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1] ?? ""} ${y}`;
}
export function isValidDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function normalizePhone(phone: string) {
  let p = (phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}
export function waLink(phone: string, text: string) {
  const p = normalizePhone(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function billingMessage(o: { kosName: string; name: string; room: string; period: string; price: number; paid: number }) {
  const remaining = Math.max(o.price - o.paid, 0);
  return [
    `Halo Kak *${o.name}* 👋`,
    ``,
    `Kami dari *${o.kosName}* ingin mengingatkan tagihan sewa kamar:`,
    ``,
    `🏠 Kamar: *${o.room}*`,
    `📅 Periode: *${periodLabel(o.period)}*`,
    `💰 Harga sewa: ${rupiah(o.price)}`,
    o.paid > 0 ? `✅ Sudah dibayar: ${rupiah(o.paid)}` : null,
    `❗ Sisa tagihan: *${rupiah(remaining)}*`,
    ``,
    `Mohon pembayaran dapat dilakukan segera. Jika sudah membayar, abaikan pesan ini.`,
    `Terima kasih 🙏`,
  ].filter((l) => l !== null).join("\n");
}

export function receiptText(p: Payment, kosName: string, ownerName: string) {
  return [
    `*KUITANSI PEMBAYARAN SEWA*`,
    `*${kosName}*`,
    `━━━━━━━━━━━━━━━━━━`,
    `No. Kuitansi : ${p.receipt_no ?? "-"}`,
    `Tanggal Bayar: ${formatDate(p.pay_date)}`,
    `Nama         : ${p.tenant_name ?? "-"}`,
    `Kamar        : ${p.room_number ?? "-"}`,
    `Periode      : ${periodLabel(p.period)}`,
    `Metode       : ${p.method}`,
    `Nominal      : *${rupiah(p.amount)}*`,
    `Status       : *${p.status === "lunas" ? "LUNAS" : "DP / BELUM LUNAS"}*`,
    p.notes ? `Catatan      : ${p.notes}` : null,
    `━━━━━━━━━━━━━━━━━━`,
    `Diterima oleh: ${ownerName || "Pengelola " + kosName}`,
    `Terima kasih atas pembayarannya 🙏`,
  ].filter((l) => l !== null).join("\n");
}
