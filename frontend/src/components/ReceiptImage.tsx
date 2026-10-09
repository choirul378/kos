import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";

import type { Payment } from "../db/repo";
import { formatDate, periodLabel, rupiah } from "../format";

const C = { ink: "#1A1F1C", muted: "#6B7280", brand: "#0F766E", line: "#E5E7EB" };

// Kartu kuitansi berbentuk gambar (JPG): diambil dari layar kuitansi via
// react-native-view-shot di mode "render as image" (tidak terlihat di layar).
export function ReceiptImage({ p, kosName, ownerName }: { p: Payment; kosName: string; ownerName: string }) {
  const lunas = p.status === "lunas";
  const row = (k: string, v: string) => (
    <View style={s.row}><Text style={s.k}>{k}</Text><Text style={s.v} numberOfLines={2}>{v}</Text></View>
  );
  return (
    <View style={s.page} collapsable={false}>
      <View style={s.card} collapsable={false}>
        <View style={s.head}>
          <View style={s.logoWrap} collapsable={false}>
            <LinearGradient colors={["#085880", "#0A8C98", "#04BEB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Image source={require("@/assets/images/logo-white.png")} style={s.logo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>KUITANSI PEMBAYARAN</Text>
            <Text style={s.kos} numberOfLines={1}>{kosName}</Text>
            <Text style={s.no}>No. {p.receipt_no ?? "-"}</Text>
          </View>
        </View>
        <View style={s.dash} />
        {row("Tanggal Bayar", formatDate(p.pay_date))}
        {row("Nama Penghuni", p.tenant_name ?? "-")}
        {row("Kamar", p.room_number ?? "-")}
        {row("Periode Sewa", periodLabel(p.period))}
        {row("Metode", p.method)}
        {p.notes ? row("Catatan", p.notes) : null}
        <View style={s.total}>
          <Text style={s.totalLabel}>Total Dibayar</Text>
          <Text style={s.totalValue}>{rupiah(p.amount)}</Text>
        </View>
        <View style={s.stampWrap}>
          <View style={[s.stamp, { borderColor: lunas ? "#16A34A" : "#D97706" }]}>
            <Text style={[s.stampText, { color: lunas ? "#16A34A" : "#D97706" }]}>{lunas ? "LUNAS" : "DP / BELUM LUNAS"}</Text>
          </View>
        </View>
        <View style={s.sign}>
          <Text style={s.signLabel}>Diterima oleh,</Text>
          <Text style={s.signName}>{ownerName || "Pengelola " + kosName}</Text>
        </View>
        <View style={s.dash} />
        <Text style={s.credit}>Dibuat dengan DSKos · dskode.com</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { width: 420, backgroundColor: "#F4F5F7", padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, borderWidth: 2, borderColor: C.brand },
  head: { flexDirection: "row", gap: 14, alignItems: "center" },
  logoWrap: { width: 60, height: 74, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  logo: { width: 44, height: 54 },
  title: { fontSize: 17, fontWeight: "800", color: C.brand, letterSpacing: 0.5 },
  kos: { fontSize: 15, fontWeight: "700", color: C.ink, marginTop: 2 },
  no: { fontSize: 12, color: C.muted, marginTop: 2 },
  dash: { borderTopWidth: 1, borderStyle: "dashed", borderColor: "#D1D5DB", marginVertical: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 6 },
  k: { fontSize: 13, color: C.muted },
  v: { fontSize: 13, fontWeight: "700", color: C.ink, flexShrink: 1, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#CCFBF1", borderRadius: 12, padding: 14, marginTop: 10 },
  totalLabel: { fontSize: 13, fontWeight: "600", color: C.brand },
  totalValue: { fontSize: 20, fontWeight: "800", color: C.brand },
  stampWrap: { alignItems: "center", marginTop: 14 },
  stamp: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 6, transform: [{ rotate: "-6deg" }] },
  stampText: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  sign: { alignItems: "flex-end", marginTop: 18 },
  signLabel: { fontSize: 12, color: C.muted },
  signName: { fontSize: 14, fontWeight: "700", color: C.ink, marginTop: 30, textDecorationLine: "underline" },
  credit: { textAlign: "center", fontSize: 11, color: "#9CA3AF" },
});
