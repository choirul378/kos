import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { deletePayment, getPayment } from "@/src/db/repo";
import { ReceiptImage } from "@/src/components/ReceiptImage";
import { useFeedback } from "@/src/feedback";
import { formatDate, periodLabel, receiptText, rupiah } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { getProfile } from "@/src/settings";
import { openWhatsApp } from "@/src/share";
import { printReceipt } from "@/src/thermal";
import { makeStyles, useTheme } from "@/src/theme";
import { Button, ErrorState, fs, Header, Icon, IconButton, Loading, rad, sp } from "@/src/ui";

export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useStyles();
  const { toast, confirm } = useFeedback();
  const [printBusy, setPrintBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const imgRef = useRef<View>(null);

  const { data, loading, error, reload } = useFocusData(async () => {
    const [p, profile] = await Promise.all([getPayment(pid), getProfile()]);
    if (!p) throw new Error("Pembayaran tidak ditemukan");
    return { p, ...profile };
  }, [pid]);

  if (loading) return <View style={s.root}><Header back title="Kuitansi" /><Loading /></View>;
  if (error || !data) return <View style={s.root}><Header back title="Kuitansi" /><ErrorState message={error ?? ""} onRetry={reload} /></View>;
  const { p, kosName, ownerName } = data;
  const lunas = p.status === "lunas";

  const row = (k: string, v: string, tid?: string) => (
    <View style={s.row}><Text style={s.k}>{k}</Text><Text testID={tid} style={s.v}>{v}</Text></View>
  );

  const thermal = async () => {
    setPrintBusy(true);
    try {
      await printReceipt(p, kosName, ownerName);
      toast("Kuitansi dikirim ke printer");
    } catch (e: any) {
      const msg = e?.message ?? "Gagal mencetak";
      toast(msg, "error");
      if (msg.includes("belum dipilih")) router.push("/settings");
    } finally {
      setPrintBusy(false);
    }
  };

  const jpg = async () => {
    setImgBusy(true);
    try {
      if (Platform.OS === "web") throw new Error("Di pratinjau web kuitansi tidak bisa dijadikan JPG. Gunakan aplikasi Android (APK)");
      const ref = imgRef.current;
      if (!ref) throw new Error("Kartu kuitansi belum siap, coba lagi");
      const { captureRef } = require("react-native-view-shot");
      const uri = await captureRef(ref, { format: "jpg", quality: 0.95 });
      const dest = `${(FileSystem as any).cacheDirectory}Kuitansi-${(p.receipt_no ?? String(p.id)).replace(/\//g, "-")}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: "image/jpeg", dialogTitle: "Simpan / Bagikan Kuitansi JPG" });
    } catch (e: any) {
      toast(e?.message ?? "Gagal membuat JPG", "error");
    } finally {
      setImgBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: "Hapus pembayaran ini?", message: "Kuitansi dan catatan pemasukan akan dihapus.", confirmText: "Hapus", destructive: true }))) return;
    await deletePayment(pid);
    toast("Pembayaran dihapus");
    router.back();
  };

  return (
    <View style={s.root} testID="receipt-screen">
      <Header back title="Kuitansi" right={<IconButton testID="receipt-edit-button" icon="create-outline" label="Edit" onPress={() => router.push({ pathname: "/payment-form", params: { id: String(pid) } })} />} />
      <ScrollView contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
        <View style={s.paper} testID="receipt-card">
          <View style={s.top}>
            <View style={s.iconWrap}><Icon name="receipt-outline" size={24} color={colors.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>KUITANSI PEMBAYARAN</Text>
              <Text style={s.kos}>{kosName}</Text>
            </View>
          </View>
          <Text testID="receipt-number" style={s.no}>No. {p.receipt_no ?? "-"}</Text>
          <View style={s.dash} />
          {row("Tanggal bayar", formatDate(p.pay_date))}
          {row("Nama penghuni", p.tenant_name ?? "-", "receipt-tenant")}
          {row("Kamar", p.room_number ?? "-")}
          {row("Periode", periodLabel(p.period), "receipt-period")}
          {row("Metode", p.method)}
          {!!p.notes && row("Catatan", p.notes)}
          <View style={s.total}>
            <Text style={s.totalLabel}>Total dibayar</Text>
            <Text testID="receipt-amount" style={s.totalValue}>{rupiah(p.amount)}</Text>
          </View>
          <View style={[s.stamp, { backgroundColor: lunas ? colors.success : colors.warning }]}>
            <Text testID="receipt-status" style={s.stampText}>{lunas ? "LUNAS" : "DP / BELUM LUNAS"}</Text>
          </View>
          <Text style={s.sign}>Diterima oleh: {ownerName || "Pengelola " + kosName}</Text>
        </View>

        <View style={{ gap: sp.md, marginTop: sp.xl }}>
          <Button testID="receipt-whatsapp-button" variant="whatsapp" icon="logo-whatsapp" title="Kirim via WhatsApp"
            onPress={() => openWhatsApp(p.tenant_phone ?? "", receiptText(p, kosName, ownerName))} />
          <Button testID="receipt-thermal-button" icon="print-outline" title="Cetak Printer Thermal" loading={printBusy} onPress={thermal} />
          <Button testID="receipt-jpg-button" variant="secondary" icon="image-outline" title="Simpan / Bagikan JPG" loading={imgBusy} onPress={jpg} />
          <Button testID="receipt-delete-button" variant="danger" icon="trash-outline" title="Hapus Pembayaran" onPress={remove} />
        </View>
      </ScrollView>
      <View ref={imgRef} style={s.offscreen} pointerEvents="none">
        <ReceiptImage p={p} kosName={kosName} ownerName={ownerName} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  offscreen: { position: "absolute", left: -1000, top: 0, opacity: 0.99 },
  paper: { backgroundColor: c.surfaceSecondary, borderRadius: rad.lg, padding: sp.xl, borderWidth: 2, borderColor: c.brandTertiary },
  top: { flexDirection: "row", gap: sp.md, alignItems: "center" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: fs.lg, fontWeight: "800", color: c.brandPrimary, letterSpacing: 0.5 },
  kos: { fontSize: fs.base, color: c.onSurface, fontWeight: "600" },
  no: { fontSize: fs.sm, color: c.muted, marginTop: sp.md },
  dash: { borderBottomWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong, marginVertical: sp.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: sp.sm, gap: sp.lg },
  k: { fontSize: fs.base, color: c.muted },
  v: { fontSize: fs.base, fontWeight: "700", color: c.onSurface, flexShrink: 1, textAlign: "right" },
  total: { marginTop: sp.md, backgroundColor: c.brandTertiary, borderRadius: rad.md, padding: sp.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: fs.base, color: c.onBrandTertiary, fontWeight: "600" },
  totalValue: { fontSize: fs.xl, fontWeight: "800", color: c.onBrandTertiary },
  stamp: { alignSelf: "flex-start", marginTop: sp.lg, borderRadius: rad.pill, paddingHorizontal: sp.md, paddingVertical: sp.xs },
  stampText: { color: c.onSuccess, fontWeight: "800", fontSize: fs.sm, letterSpacing: 0.5 },
  sign: { marginTop: sp.lg, textAlign: "right", fontSize: fs.sm, color: c.onSurfaceTertiary },
}));
