import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { checkoutTenant, deleteTenant, getPaidForPeriod, getTenant, listPayments } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { billingMessage, currentPeriod, formatDate, normalizePhone, periodLabel, rupiah, shiftPeriod } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { getProfile } from "@/src/settings";
import { openWhatsApp } from "@/src/share";
import { makeStyles, useTheme } from "@/src/theme";
import { Avatar, Badge, Button, Card, ErrorState, fs, Header, Icon, IconButton, InfoRow, Loading, rad, SectionTitle, sp } from "@/src/ui";

export default function TenantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useStyles();
  const { toast, confirm } = useFeedback();
  const [showKtp, setShowKtp] = useState(false);
  const period = currentPeriod();

  const { data, loading, error, reload } = useFocusData(async () => {
    const [tenant, payments, paid, profile] = await Promise.all([getTenant(tid), listPayments({ tenantId: tid }), getPaidForPeriod(tid, period), getProfile()]);
    if (!tenant) throw new Error("Penghuni tidak ditemukan");
    return { tenant, payments, paid, ...profile };
  }, [tid]);

  if (loading) return <View style={s.root}><Header back title="Detail Penghuni" /><Loading /></View>;
  if (error || !data) return <View style={s.root}><Header back title="Detail Penghuni" /><ErrorState message={error ?? ""} onRetry={reload} /></View>;
  const { tenant: t, payments, paid } = data;
  const price = t.room_price ?? 0;
  const lunas = price > 0 && paid >= price;
  const billPeriod = lunas ? shiftPeriod(period, 1) : period;
  const billPaid = lunas ? 0 : paid;

  const sendBill = () => {
    if (!t.phone) return toast("Nomor HP belum diisi", "error");
    if (!t.room_number) return toast("Penghuni belum memiliki kamar", "error");
    openWhatsApp(t.phone, billingMessage({ kosName: data.kosName, name: t.name, room: t.room_number, period: billPeriod, price, paid: billPaid }));
  };

  const checkout = async () => {
    if (!(await confirm({ title: `Checkout ${t.name}?`, message: "Status menjadi Alumni dan kamar otomatis menjadi kosong. Riwayat pembayaran tetap tersimpan.", confirmText: "Checkout" }))) return;
    await checkoutTenant(tid);
    toast("Penghuni ditandai keluar");
    reload();
  };

  const remove = async () => {
    if (!(await confirm({ title: `Hapus ${t.name}?`, message: "Data penghuni dan seluruh riwayat pembayarannya akan dihapus permanen.", confirmText: "Hapus", destructive: true }))) return;
    await deleteTenant(tid);
    toast("Penghuni dihapus");
    router.back();
  };

  return (
    <View style={s.root} testID="tenant-detail-screen">
      <Header back title="Detail Penghuni" right={<IconButton testID="tenant-edit-button" icon="create-outline" label="Edit" onPress={() => router.push({ pathname: "/tenant-form", params: { id: String(tid) } })} />} />
      <ScrollView contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
        <Card style={s.profile}>
          <Avatar name={t.name} size={64} />
          <View style={{ flex: 1 }}>
            <Text testID="tenant-detail-name" style={s.name}>{t.name}</Text>
            <Text style={s.sub}>{t.room_number ? `Kamar ${t.room_number} · ${rupiah(price)}/bln` : "Belum ada kamar"}</Text>
            <View style={{ flexDirection: "row", gap: sp.xs, marginTop: sp.sm }}>
              <Badge testID="tenant-detail-status" label={t.status === "aktif" ? "Aktif" : "Alumni"} tone={t.status === "aktif" ? "success" : "neutral"} />
              {t.status === "aktif" && price > 0 && <Badge testID="tenant-detail-bill-status" label={lunas ? `Lunas ${periodLabel(period)}` : paid > 0 ? "DP bulan ini" : "Belum bayar"} tone={lunas ? "brand" : paid > 0 ? "warning" : "error"} />}
            </View>
          </View>
        </Card>

        {t.status === "aktif" && (
          <View style={s.actions}>
            <Button testID="tenant-pay-button" icon="cash-outline" title="Catat Bayar" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/payment-form", params: { tenantId: String(tid) } })} />
            <Button testID="tenant-bill-button" variant="whatsapp" icon="logo-whatsapp" title="Kirim Tagihan" style={{ flex: 1 }} onPress={sendBill} />
          </View>
        )}

        <Card style={{ marginTop: sp.lg, paddingVertical: sp.xs }}>
          <InfoRow label="No. HP" value={t.phone || "-"} testID="tenant-detail-phone" />
          <InfoRow label="Tanggal masuk" value={formatDate(t.entry_date)} />
          {t.exit_date && <InfoRow label="Tanggal keluar" value={formatDate(t.exit_date)} />}
          {!!t.notes && <InfoRow label="Catatan" value={t.notes} />}
          {!!t.phone && (
            <Pressable testID="tenant-call-button" style={s.callRow} onPress={() => Linking.openURL(`tel:+${normalizePhone(t.phone)}`)}>
              <Icon name="call-outline" size={18} color={colors.brandPrimary} />
              <Text style={s.callText}>Telepon penghuni</Text>
            </Pressable>
          )}
        </Card>

        <SectionTitle title="Foto KTP" />
        {t.ktp_photo ? (
          <Pressable testID="tenant-ktp-image" onPress={() => setShowKtp(true)}>
            <Image source={{ uri: t.ktp_photo }} style={s.ktp} contentFit="cover" />
          </Pressable>
        ) : <Text style={s.muted}>Belum ada foto KTP. Tambahkan lewat tombol edit.</Text>}

        <SectionTitle title={`Riwayat Pembayaran (${payments.length})`} />
        {payments.length === 0 ? <Text style={s.muted}>Belum ada pembayaran.</Text> : (
          <Card style={{ paddingVertical: sp.xs }}>
            {payments.map((p, i) => (
              <Pressable key={p.id} testID={`tenant-payment-${p.id}`} style={[s.payRow, i > 0 && s.payBorder]} onPress={() => router.push(`/receipt/${p.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.payTitle}>{periodLabel(p.period)}</Text>
                  <Text style={s.paySub}>Dibayar {formatDate(p.pay_date)} · {p.method}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={s.payAmt}>{rupiah(p.amount)}</Text>
                  <Badge label={p.status === "lunas" ? "Lunas" : "DP"} tone={p.status === "lunas" ? "success" : "warning"} />
                </View>
              </Pressable>
            ))}
          </Card>
        )}

        <View style={{ gap: sp.md, marginTop: sp.xl }}>
          {t.status === "aktif" && <Button testID="tenant-checkout-button" variant="ghost" icon="exit-outline" title="Checkout (Tandai Keluar)" onPress={checkout} />}
          <Button testID="tenant-delete-button" variant="danger" icon="trash-outline" title="Hapus Penghuni" onPress={remove} />
        </View>
      </ScrollView>

      <Modal visible={showKtp} transparent animationType="fade" onRequestClose={() => setShowKtp(false)} statusBarTranslucent>
        <Pressable testID="ktp-modal" style={s.modal} onPress={() => setShowKtp(false)}>
          {t.ktp_photo && <Image source={{ uri: t.ktp_photo }} style={s.ktpFull} contentFit="contain" />}
          <Text style={s.modalHint}>Ketuk untuk menutup</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  profile: { flexDirection: "row", gap: sp.lg, alignItems: "center" },
  name: { fontSize: fs.xl, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: fs.base, color: c.muted, marginTop: 2 },
  actions: { flexDirection: "row", gap: sp.md, marginTop: sp.lg },
  callRow: { flexDirection: "row", alignItems: "center", gap: sp.sm, paddingVertical: sp.md, minHeight: 44 },
  callText: { color: c.brandPrimary, fontWeight: "700", fontSize: fs.base },
  ktp: { width: "100%", height: 200, borderRadius: rad.md, backgroundColor: c.surfaceTertiary },
  muted: { color: c.muted, fontSize: fs.base },
  payRow: { flexDirection: "row", alignItems: "center", paddingVertical: sp.md, gap: sp.md },
  payBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  payTitle: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  paySub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  payAmt: { fontSize: fs.base, fontWeight: "800", color: c.onSurface },
  modal: { flex: 1, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center", padding: sp.lg },
  ktpFull: { width: "100%", height: "80%" },
  modalHint: { color: c.onSurfaceInverse, marginTop: sp.lg, opacity: 0.7 },
}));
