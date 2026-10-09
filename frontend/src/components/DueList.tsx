import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { DueItem } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { billingMessage, formatDate, rupiah } from "@/src/format";
import { openWhatsApp } from "@/src/share";
import { makeStyles, useTheme } from "@/src/theme";
import { Badge, Button, Card, fs, Icon, rad, sp } from "@/src/ui";

export function dueLabel(days: number) {
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}

// Daftar penghuni yang jatuh tempo dalam 7 hari ke depan (dipakai di Beranda & tab Penghuni).
export function DueList({ items, kosName, testIDPrefix = "due" }: { items: DueItem[]; kosName: string; testIDPrefix?: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useFeedback();
  const s = useStyles();

  if (items.length === 0) {
    return (
      <Card testID={`${testIDPrefix}-empty`} style={s.okCard}>
        <Icon name="calendar-outline" size={24} color={colors.info} />
        <Text style={s.okText}>Tidak ada penghuni yang jatuh tempo dalam 7 hari ke depan.</Text>
      </Card>
    );
  }

  return (
    <View>
      {items.map((d) => (
        <Card key={d.tenant_id} testID={`${testIDPrefix}-${d.tenant_id}`} style={s.card} onPress={() => router.push(`/tenant/${d.tenant_id}`)}>
          <View style={s.row}>
            <View style={[s.dateTile, { backgroundColor: d.paid_off ? colors.successSoft : d.days_left <= 1 ? colors.errorSoft : colors.warningSoft }]}>
              <Text style={[s.dateDay, { color: d.paid_off ? colors.success : d.days_left <= 1 ? colors.error : colors.warning }]}>{d.due_date.slice(8, 10)}</Text>
              <Text style={[s.dateMon, { color: d.paid_off ? colors.success : d.days_left <= 1 ? colors.error : colors.warning }]}>{formatDate(d.due_date).split(" ")[1]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{d.name}</Text>
              <Text style={s.sub} numberOfLines={1}>Kamar {d.room_number} · {dueLabel(d.days_left)}</Text>
              <Text style={s.sub} numberOfLines={1}>{d.paid_off ? `Lunas ${rupiah(d.price)}` : `Sisa ${rupiah(d.remaining)}${d.paid > 0 ? " · DP " + rupiah(d.paid) : ""}`}</Text>
            </View>
            <Badge testID={`${testIDPrefix}-${d.tenant_id}-status`} label={d.paid_off ? "Lunas" : d.paid > 0 ? "DP" : "Belum"} tone={d.paid_off ? "success" : d.paid > 0 ? "warning" : "error"} />
          </View>
          {!d.paid_off && (
            <View style={s.actions}>
              <Button testID={`${testIDPrefix}-${d.tenant_id}-bill`} size="sm" variant="whatsapp" icon="logo-whatsapp" title="Ingatkan" style={{ flex: 1 }}
                onPress={() => {
                  if (!d.phone) return toast("Nomor HP penghuni belum diisi", "error");
                  openWhatsApp(d.phone, billingMessage({ kosName, name: d.name, room: d.room_number, period: d.period, price: d.price, paid: d.paid }));
                }} />
              <Button testID={`${testIDPrefix}-${d.tenant_id}-pay`} size="sm" variant="secondary" icon="cash-outline" title="Catat Bayar" style={{ flex: 1 }}
                onPress={() => router.push({ pathname: "/payment-form", params: { tenantId: String(d.tenant_id), period: d.period } })} />
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  okCard: { flexDirection: "row", alignItems: "center", gap: sp.md },
  okText: { flex: 1, fontSize: fs.base, color: c.onSurfaceTertiary },
  card: { marginBottom: sp.md },
  row: { flexDirection: "row", alignItems: "center", gap: sp.md },
  dateTile: { width: 48, height: 48, borderRadius: rad.md, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: fs.lg, fontWeight: "800", lineHeight: 18 },
  dateMon: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  name: { fontSize: fs.lg, fontWeight: "700", color: c.onSurface },
  sub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  actions: { flexDirection: "row", gap: sp.sm, marginTop: sp.md },
}));
