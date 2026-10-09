import { Linking, PermissionsAndroid, Platform } from "react-native";

import { BtPrinter, PairedDevice } from "@/modules/bt-printer";
import type { Payment } from "./db/repo";
import { formatDate, periodLabel, rupiah } from "./format";
import { storage } from "./utils/storage";

export type PaperWidth = 58 | 80;
export type PrinterConfig = { address: string; name: string; width: PaperWidth };

const KEY_ADDR = "printer_address";
const KEY_NAME = "printer_name";
const KEY_WIDTH = "printer_width";

export const printerSupported = () => Platform.OS === "android" && !!BtPrinter;

export async function getPrinterConfig(): Promise<PrinterConfig> {
  return {
    address: (await storage.getItem(KEY_ADDR, "")) || "",
    name: (await storage.getItem(KEY_NAME, "")) || "",
    width: ((await storage.getItem<number>(KEY_WIDTH, 58)) === 80 ? 80 : 58) as PaperWidth,
  };
}
export async function savePrinter(d: PairedDevice) {
  await storage.setItem(KEY_ADDR, d.address);
  await storage.setItem(KEY_NAME, d.name);
}
export const savePaperWidth = (w: PaperWidth) => storage.setItem(KEY_WIDTH, w);

function cleanError(e: any) {
  const m = String(e?.message ?? e ?? "Gagal mencetak");
  if (/permission|Izin Bluetooth/i.test(m)) return new BtPermissionError(false);
  const i = m.lastIndexOf("Caused by:");
  return new Error((i >= 0 ? m.slice(i + 10) : m).replace(/^.*Exception:\s*/, "").trim());
}

export class BtPermissionError extends Error {
  constructor(public blocked: boolean) {
    super(blocked
      ? "Izin 'Perangkat sekitar' diblokir. Buka Pengaturan aplikasi untuk mengizinkan DSKos"
      : "Izin Bluetooth ditolak. Izinkan 'Perangkat sekitar' agar DSKos bisa mencetak");
  }
}

// Only BLUETOOTH_CONNECT is needed: we use already-paired devices and never scan.
async function ensurePermission() {
  if (Platform.OS !== "android" || Number(Platform.Version) < 31) return;
  const perm = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  if (await PermissionsAndroid.check(perm)) return;
  const r = await PermissionsAndroid.request(perm, {
    title: "Izin Perangkat Sekitar",
    message: "DSKos perlu izin ini untuk terhubung ke printer thermal Bluetooth Anda.",
    buttonPositive: "Izinkan",
    buttonNegative: "Nanti",
  });
  if (r === PermissionsAndroid.RESULTS.GRANTED) return;
  throw new BtPermissionError(r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
}

type Feedback = {
  toast: (m: string, t?: "success" | "error" | "info") => void;
  confirm: (o: { title: string; message?: string; confirmText?: string }) => Promise<boolean>;
};

/** Shows a print error; offers "Buka Pengaturan" when permission is permanently blocked. */
export async function showPrintError(e: any, fb: Feedback) {
  if (e instanceof BtPermissionError && e.blocked) {
    const ok = await fb.confirm({ title: "Izin Bluetooth diperlukan", message: e.message, confirmText: "Buka Pengaturan" });
    if (ok) Linking.openSettings();
    return;
  }
  fb.toast(e?.message ?? "Gagal mencetak", "error");
}

export async function listPairedPrinters() {
  if (!printerSupported()) throw new Error("Cetak thermal hanya tersedia di aplikasi Android (APK)");
  await ensurePermission();
  try { return await BtPrinter!.getPairedDevices(); } catch (e) { throw cleanError(e); }
}

async function send(bytes: number[]) {
  const cfg = await getPrinterConfig();
  if (!printerSupported()) throw new Error("Cetak thermal hanya tersedia di aplikasi Android (APK)");
  if (!cfg.address) throw new Error("Printer belum dipilih. Atur printer di Pengaturan");
  await ensurePermission();
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  try { await BtPrinter!.print(cfg.address, btoa(bin)); } catch (e) { throw cleanError(e); }
}

// ESC/POS builder
const ESC = 0x1b, GS = 0x1d;
class Doc {
  b: number[] = [ESC, 0x40];
  constructor(public cols: number) {}
  text(s: string) {
    for (const ch of s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
      const c = ch.charCodeAt(0);
      this.b.push(c < 128 ? c : 0x3f);
    }
    return this;
  }
  line(s = "") { return this.text(s).raw(0x0a); }
  raw(...x: number[]) { this.b.push(...x); return this; }
  align(a: 0 | 1 | 2) { return this.raw(ESC, 0x61, a); }
  bold(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
  size(big: boolean) { return this.raw(GS, 0x21, big ? 0x11 : 0x00); }
  sep(ch = "-") { return this.line(ch.repeat(this.cols)); }
  pair(k: string, v: string) {
    const room = this.cols - k.length - 1;
    if (v.length <= room) return this.line(k + " ".repeat(this.cols - k.length - v.length) + v);
    this.line(k);
    return this.align(2).line(v).align(0);
  }
  wrap(s: string) {
    const words = s.split(/\s+/);
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > this.cols) { this.line(cur); cur = w; } else cur = (cur + " " + w).trim();
    }
    return cur ? this.line(cur) : this;
  }
  end() { return this.raw(0x0a, 0x0a, 0x0a, 0x0a, GS, 0x56, 0x42, 0x00).b; }
}

export function receiptBytes(p: Payment, kosName: string, ownerName: string, width: PaperWidth) {
  const d = new Doc(width === 80 ? 48 : 32);
  const lunas = p.status === "lunas";
  d.align(1).bold(true).size(true).wrap(kosName.toUpperCase()).size(false).bold(false)
    .line("KUITANSI PEMBAYARAN").line(`No. ${p.receipt_no ?? "-"}`).align(0).sep();
  d.pair("Tanggal", formatDate(p.pay_date))
    .pair("Penghuni", p.tenant_name ?? "-")
    .pair("Kamar", p.room_number ?? "-")
    .pair("Periode", periodLabel(p.period))
    .pair("Metode", p.method);
  if (p.notes) d.line("Catatan:").wrap(p.notes);
  d.sep().bold(true).pair("TOTAL", rupiah(p.amount)).bold(false).sep();
  d.align(1).bold(true).size(true).line(lunas ? "LUNAS" : "DP").size(false).bold(false);
  if (!lunas) d.line("BELUM LUNAS");
  d.line().line("Diterima oleh:").line(ownerName || "Pengelola " + kosName)
    .line().line("Terima kasih atas pembayarannya").line("DSKos - dskode.com");
  return d.end();
}

export async function printReceipt(p: Payment, kosName: string, ownerName: string) {
  const cfg = await getPrinterConfig();
  await send(receiptBytes(p, kosName, ownerName, cfg.width));
}

export async function printTest() {
  const cfg = await getPrinterConfig();
  const d = new Doc(cfg.width === 80 ? 48 : 32);
  d.align(1).bold(true).size(true).line("DSKos").size(false).bold(false)
    .line("Tes printer berhasil").line(`Kertas ${cfg.width} mm`).sep("=").line("dskode.com");
  await send(d.end());
}
