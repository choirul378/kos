import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getRoom, listPayments } from "@/src/db/repo";
import { formatDate, periodLabel, rupiah } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { makeStyles, useTheme } from "@/src/theme";
import { Avatar, Badge, Button, Card, ErrorState, fs, Header, Icon, IconButton, InfoRow, Loading, SectionTitle, sp } from "@/src/ui";

export default function RoomDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rid = Number(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useStyles();

  const { data, loading, error, reload } = useFocusData(async () => {
    const [room, payments] = await Promise.all([getRoom(rid), listPayments({ roomId: rid })]);
    if (!room) throw new Error("Kamar tidak ditemukan");
    return { room, payments };
  }, [rid]);

  if (loading) return <View style={s.root}><Header back title="Detail Kamar" /><Loading /></View>;
  if (error || !data) return <View style={s.root}><Header back title="Detail Kamar" /><ErrorState message={error ?? ""} onRetry={reload} /></View>;
  const { room: r, payments } = data;
  const total = payments.reduce((a, p) => a + p.amount, 0);

  return (
    <View style={s.root} testID="room-detail-screen">
      <Header back title={`Kamar ${r.number}`} subtitle={r.type || "Kamar Standar"}
        right={<IconButton testID="room-edit-button" icon="create-outline" label="Edit" onPress={() => router.push({ pathname: "/room-form", params: { id: String(rid) } })} />} />
      <ScrollView contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
        <Card style={s.hero}>
          <Text style={s.heroLabel}>Harga sewa</Text>
          <Text testID="room-detail-price" style={s.heroPrice}>{rupiah(r.price)}<Text style={s.per}> /bulan</Text></Text>
          <View style={{ marginTop: sp.sm }}>
            <Badge testID="room-detail-status" label={r.status === "terisi" ? "Terisi" : "Kosong"} tone={r.status === "terisi" ? "success" : "info"} />
          </View>
        </Card>

        <Card style={{ marginTop: sp.lg, paddingVertical: sp.xs }}>
          <InfoRow label="Fasilitas" value={r.facilities || "-"} />
          <InfoRow label="Catatan" value={r.notes || "-"} />
          <InfoRow label="Total pemasukan kamar" value={rupiah(total)} testID="room-detail-total" />
        </Card>

        <SectionTitle title="Penghuni Saat Ini" />
        {r.tenant_id ? (
          <Card testID="room-current-tenant" onPress={() => router.push(`/tenant/${r.tenant_id}`)} style={s.tenant}>
            <Avatar name={r.tenant_name ?? "?"} />
            <Text style={s.tenantName}>{r.tenant_name}</Text>
            <Icon name="chevron-forward" size={20} color={colors.muted} />
          </Card>
        ) : (
          <Button testID="room-add-tenant-button" variant="secondary" icon="person-add-outline" title="Isi kamar dengan penghuni baru"
            onPress={() => router.push({ pathname: "/tenant-form", params: { roomId: String(rid) } })} />
        )}

        <SectionTitle title={`Riwayat Pembayaran (${payments.length})`} />
        {payments.length === 0 ? <Text style={s.muted}>Belum ada pembayaran untuk kamar ini.</Text> : (
          <Card style={{ paddingVertical: sp.xs }}>
            {payments.map((p, i) => (
              <Pressable key={p.id} testID={`room-payment-${p.id}`} style={[s.row, i > 0 && s.border]} onPress={() => router.push(`/receipt/${p.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p.tenant_name} · {periodLabel(p.period)}</Text>
                  <Text style={s.rowSub}>{formatDate(p.pay_date)} · {p.status === "lunas" ? "Lunas" : "DP"}</Text>
                </View>
                <Text style={s.amt}>{rupiah(p.amount)}</Text>
              </Pressable>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { backgroundColor: c.brandTertiary, borderColor: c.brandTertiary },
  heroLabel: { fontSize: fs.base, color: c.onBrandTertiary, fontWeight: "600" },
  heroPrice: { fontSize: 28, fontWeight: "800", color: c.onBrandTertiary, marginTop: 2 },
  per: { fontSize: fs.base, fontWeight: "500" },
  tenant: { flexDirection: "row", alignItems: "center", gap: sp.md },
  tenantName: { flex: 1, fontSize: fs.lg, fontWeight: "700", color: c.onSurface },
  muted: { color: c.muted, fontSize: fs.base },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: sp.md, gap: sp.md },
  border: { borderTopWidth: 1, borderTopColor: c.divider },
  rowTitle: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  amt: { fontSize: fs.base, fontWeight: "800", color: c.success },
}));
