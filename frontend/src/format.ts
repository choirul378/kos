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

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function receiptHtml(p: Payment, kosName: string, ownerName: string) {
  const row = (k: string, v: string) => `<tr><td class="k">${k}</td><td class="v">${esc(v)}</td></tr>`;
  const lunas = p.status === "lunas";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{font-family:Helvetica,Arial,sans-serif;color:#1A1F1C;padding:32px;}
.box{border:2px solid #0F766E;border-radius:16px;padding:28px;max-width:560px;margin:0 auto;}
h1{margin:0;color:#0F766E;font-size:22px;letter-spacing:1px}
h2{margin:4px 0 0;font-size:16px;font-weight:600}
.no{color:#6B7280;font-size:12px;margin-top:6px}
table{width:100%;border-collapse:collapse;margin-top:20px}
td{padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:14px}
.k{color:#6B7280;width:40%}.v{font-weight:600;text-align:right}
.total{margin-top:20px;background:#CCFBF1;border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center}
.total b{font-size:22px;color:#0F766E}
.stamp{display:inline-block;margin-top:16px;padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;color:#fff;background:${lunas ? "#16A34A" : "#D97706"}}
.sign{margin-top:40px;text-align:right;font-size:13px;color:#374151}
.credit{margin-top:24px;text-align:center;font-size:11px;color:#9CA3AF}
</style></head><body><div class="box">
<h1>KUITANSI PEMBAYARAN</h1><h2>${esc(kosName)}</h2><div class="no">No. ${esc(p.receipt_no ?? "-")}</div>
<table>
${row("Tanggal Bayar", formatDate(p.pay_date))}
${row("Nama Penghuni", p.tenant_name ?? "-")}
${row("Kamar", p.room_number ?? "-")}
${row("Periode Sewa", periodLabel(p.period))}
${row("Metode", p.method)}
${p.notes ? row("Catatan", p.notes) : ""}
</table>
<div class="total"><span>Total Dibayar</span><b>${rupiah(p.amount)}</b></div>
<span class="stamp">${lunas ? "LUNAS" : "DP / BELUM LUNAS"}</span>
<div class="sign">Diterima oleh,<br/><br/><br/><b>${esc(ownerName || "Pengelola " + kosName)}</b></div>
</div><div class="credit">Dibuat oleh: dskode.com</div></body></html>`;
}
