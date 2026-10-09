// Template HTML laporan arus kas bulanan untuk export PDF.
import type { FinanceItem } from "./db/repo";
import { formatDate, periodLabel, rupiah } from "./format";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export type ReportSummary = {
  rent: number; otherIncome: number; income: number; expense: number; net: number;
  byCategory: { category: string; total: number }[];
};

export function monthlyReportHtml(o: {
  period: string; kosName: string; ownerName: string; summary: ReportSummary;
  masuk: FinanceItem[]; keluar: FinanceItem[]; occupancy: { total: number; terisi: number };
}) {
  const { summary } = o;
  const txRows = (items: FinanceItem[], sign: string) => items.length === 0
    ? `<tr><td colspan="4" class="empty">Tidak ada transaksi</td></tr>`
    : items.map((it, i) => `<tr>
        <td class="n">${i + 1}</td><td>${formatDate(it.date)}</td>
        <td>${esc(it.title)}<div class="sub">${esc(it.subtitle)}</div></td>
        <td class="amt ${sign === "+" ? "in" : "out"}">${sign}${rupiah(it.amount)}</td></tr>`).join("");
  const sumRow = (k: string, v: number, cls = "") => `<tr class="${cls}"><td>${k}</td><td class="amt">${rupiah(v)}</td></tr>`;
  const printed = new Date();
  const printedAt = `${formatDate(`${printed.getFullYear()}-${String(printed.getMonth() + 1).padStart(2, "0")}-${String(printed.getDate()).padStart(2, "0")}`)}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{font-family:Helvetica,Arial,sans-serif;color:#1A1F1C;padding:28px;font-size:13px}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0F766E;padding-bottom:14px}
h1{margin:0;color:#0F766E;font-size:20px;letter-spacing:1px}
h2{margin:4px 0 0;font-size:15px;font-weight:600}
.meta{text-align:right;color:#6B7280;font-size:12px}
.cards{display:flex;gap:12px;margin:18px 0}
.card{flex:1;border-radius:12px;padding:14px;background:#F3F4F6}
.card .l{font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
.card .v{font-size:18px;font-weight:800;margin-top:4px}
.card.in{background:#DCFCE7}.card.in .v{color:#16A34A}
.card.out{background:#FEE2E2}.card.out .v{color:#DC2626}
.card.net{background:#CCFBF1}.card.net .v{color:#0F766E}
h3{font-size:14px;color:#0F766E;margin:22px 0 8px;border-left:4px solid #0F766E;padding-left:8px}
table{width:100%;border-collapse:collapse}
td,th{padding:7px 6px;border-bottom:1px solid #E5E7EB;text-align:left;vertical-align:top}
th{background:#F9FAFB;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
.n{width:28px;color:#9CA3AF}.amt{text-align:right;white-space:nowrap;font-weight:600}
.in{color:#16A34A}.out{color:#DC2626}
.sub{color:#6B7280;font-size:11px;margin-top:2px}
.empty{text-align:center;color:#9CA3AF;padding:14px}
tr.bold td{font-weight:800;border-top:2px solid #D1D5DB}
tr.net td{font-weight:800;color:#0F766E;font-size:14px}
.foot{margin-top:36px;display:flex;justify-content:space-between;font-size:12px;color:#374151}
.sign{text-align:right}.sign b{display:block;margin-top:44px}
</style></head><body>
<div class="head">
  <div><h1>LAPORAN KEUANGAN BULANAN</h1><h2>${esc(o.kosName)}</h2></div>
  <div class="meta">Periode<br/><b style="color:#1A1F1C;font-size:14px">${periodLabel(o.period)}</b><br/>Dicetak ${printedAt}</div>
</div>
<div class="cards">
  <div class="card in"><div class="l">Total Pemasukan</div><div class="v">${rupiah(summary.income)}</div></div>
  <div class="card out"><div class="l">Total Pengeluaran</div><div class="v">${rupiah(summary.expense)}</div></div>
  <div class="card net"><div class="l">Saldo Bersih</div><div class="v">${rupiah(summary.net)}</div></div>
  <div class="card"><div class="l">Hunian</div><div class="v">${o.occupancy.terisi}/${o.occupancy.total} kamar</div></div>
</div>

<h3>Ringkasan</h3>
<table>
${sumRow("Sewa kamar", summary.rent)}
${sumRow("Pemasukan lain", summary.otherIncome)}
${sumRow("Total pemasukan", summary.income, "bold")}
${summary.byCategory.map((c) => sumRow("− " + esc(c.category), -c.total)).join("")}
${sumRow("Total pengeluaran", -summary.expense, "bold")}
${sumRow("Saldo bersih", summary.net, "net")}
</table>

<h3>Rincian Pemasukan (${o.masuk.length} transaksi)</h3>
<table><thead><tr><th>#</th><th>Tanggal</th><th>Keterangan</th><th class="amt">Nominal</th></tr></thead>
<tbody>${txRows(o.masuk, "+")}</tbody></table>

<h3>Rincian Pengeluaran (${o.keluar.length} transaksi)</h3>
<table><thead><tr><th>#</th><th>Tanggal</th><th>Keterangan</th><th class="amt">Nominal</th></tr></thead>
<tbody>${txRows(o.keluar, "−")}</tbody></table>

<div class="foot">
  <div>Dibuat otomatis oleh KosManager</div>
  <div class="sign">Pengelola,<b>${esc(o.ownerName || "Pengelola " + o.kosName)}</b></div>
</div>
</body></html>`;
}
