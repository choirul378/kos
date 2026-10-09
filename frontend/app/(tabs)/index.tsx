import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DueList } from "@/src/components/DueList";
import { getDashboard } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { billingMessage, currentPeriod, formatDate, periodLabel, rupiah } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { useLock } from "@/src/lock";
import { usesNativeTabs } from "@/src/navigation";
import { getProfile } from "@/src/settings";
import { openWhatsApp } from "@/src/share";
import { makeStyles, useTheme } from "@/src/theme";
import { Badge, Button, Card, ErrorState, fs, haptic, Icon, IconButton, IconName, Loading, rad, SectionTitle, sp } from "@/src/ui";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const router = useRouter();
  const { hasPin } = useLock();
  const { toast } = useFeedback();
  const period = currentPeriod();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { data, loading, error, refreshing, refresh, reload } = useFocusData(async () => {
    const [d, profile] = await Promise.all([getDashboard(period), getProfile()]);
    return { ...d, ...profile };
  });

  const stats: { key: string; label: string; value: number; icon: IconName; tint: string; fg: string; onPress: () => void }[] = data ? [
    { key: "total", label: "Total Kamar", value: data.total, icon: "business-outline", tint: colors.brandTertiary, fg: colors.brandPrimary, onPress: () => router.navigate({ pathname: "/rooms", params: { filter: "semua" } }) },
    { key: "terisi", label: "Terisi", value: data.terisi, icon: "people-outline", tint: colors.successSoft, fg: colors.success, onPress: () => router.navigate({ pathname: "/rooms", params: { filter: "terisi" } }) },
    { key: "kosong", label: "Kosong", value: data.kosong, icon: "bed-outline", tint: colors.infoSoft, fg: colors.info, onPress: () => router.navigate({ pathname: "/rooms", params: { filter: "kosong" } }) },
    { key: "menunggak", label: "Menunggak", value: data.menunggak, icon: "alert-circle-outline", tint: colors.errorSoft, fg: colors.error, onPress: () => {} },
  ] : [];

  const actions: { key: string; label: string; icon: IconName; to: any }[] = [
    { key: "pay", label: "Catat Bayar", icon: "cash-outline", to: "/payment-form" },
    { key: "tenant", label: "Penghuni Baru", icon: "person-add-outline", to: "/tenant-form" },
    { key: "room", label: "Kamar Baru", icon: "add-circle-outline", to: "/room-form" },
    { key: "expense", label: "Pengeluaran", icon: "arrow-up-circle-outline", to: { pathname: "/cash-form", params: { type: "keluar" } } },
  ];

  return (
    <View style={s.root} testID="home-screen">
      <View style={[s.header, { paddingTop: insets.top + sp.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.hello}>Selamat datang 👋</Text>
          <Text testID="home-kos-name" style={s.kosName} numberOfLines={1}>{data?.kosName ?? "KosManager"}</Text>
        </View>
        <IconButton testID="home-settings-button" icon="settings-outline" label="Pengaturan" onPress={() => router.push("/settings")} />
      </View>
      {loading ? <Loading /> : error || !data ? <ErrorState message={error ?? ""} onRetry={reload} /> : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: sp.lg, paddingBottom: bottomChrome + sp.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPrimary} />}
          showsVerticalScrollIndicator={false}
        >
          {!hasPin && (
            <Card testID="pin-banner" onPress={() => router.push("/pin-setup")} style={s.banner}>
              <Icon name="shield-checkmark-outline" size={24} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>Amankan data kos Anda</Text>
                <Text style={s.bannerSub}>Aktifkan PIN agar hanya Anda yang bisa membuka aplikasi.</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </Card>
          )}

          <LinearGradient colors={[colors.brandPrimary, colors.brandSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <Text style={s.heroLabel}>Pemasukan {periodLabel(period)}</Text>
            <Text testID="home-income-value" style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit>{rupiah(data.summary.income)}</Text>
            <View style={s.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroSmallLabel}>Pengeluaran</Text>
                <Text testID="home-expense-value" style={s.heroSmallValue} numberOfLines={1} adjustsFontSizeToFit>{rupiah(data.summary.expense)}</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={{ flex: 1 }}>
                <Text style={s.heroSmallLabel}>Saldo Bersih</Text>
                <Text testID="home-net-value" style={s.heroSmallValue} numberOfLines={1} adjustsFontSizeToFit>{rupiah(data.summary.net)}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={s.grid}>
            {stats.map((st) => (
              <Pressable key={st.key} testID={`stat-${st.key}`} onPress={() => { haptic(); st.onPress(); }} style={({ pressed }) => [s.stat, pressed && { opacity: 0.85 }]}>
                <View style={[s.statIcon, { backgroundColor: st.tint }]}><Icon name={st.icon} size={20} color={st.fg} /></View>
                <Text testID={`stat-${st.key}-value`} style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Aksi Cepat" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.md }} style={{ marginHorizontal: -sp.lg }}>
            <View style={{ width: sp.lg - sp.md }} />
            {actions.map((a) => (
              <Pressable key={a.key} testID={`quick-${a.key}`} onPress={() => { haptic(); router.push(a.to); }} style={({ pressed }) => [s.action, pressed && { opacity: 0.85 }]}>
                <View style={s.actionIcon}><Icon name={a.icon} size={24} color={colors.brandPrimary} /></View>
                <Text style={s.actionLabel} numberOfLines={2}>{a.label}</Text>
              </Pressable>
            ))}
            <View style={{ width: sp.lg - sp.md }} />
          </ScrollView>

          <SectionTitle title="Jatuh Tempo 7 Hari ke Depan" />
          <DueList items={data.dueSoon} kosName={data.kosName} />

          <SectionTitle title={`Belum Bayar · ${periodLabel(period)}`} />
          {data.arrears.length === 0 ? (
            <Card testID="arrears-empty" style={s.okCard}>
              <Icon name="checkmark-circle" size={24} color={colors.success} />
              <Text style={s.okText}>{data.total ? "Semua penghuni aktif sudah lunas bulan ini." : "Belum ada data kamar & penghuni."}</Text>
            </Card>
          ) : data.arrears.map((a) => (
            <Card key={a.tenant_id} testID={`arrear-${a.tenant_id}`} style={s.arrear} onPress={() => router.push(`/tenant/${a.tenant_id}`)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp.md }}>
                <View style={s.roomTile}><Text style={s.roomTileText} numberOfLines={1}>{a.room_number}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.arrearName} numberOfLines={1}>{a.name}</Text>
                  <Text style={s.arrearSub}>Sisa {rupiah(a.remaining)}{a.paid > 0 ? " · DP " + rupiah(a.paid) : ""}</Text>
                </View>
                <Badge label={a.paid > 0 ? "DP" : "Belum"} tone={a.paid > 0 ? "warning" : "error"} />
              </View>
              <View style={s.arrearActions}>
                <Button testID={`arrear-${a.tenant_id}-bill`} size="sm" variant="whatsapp" icon="logo-whatsapp" title="Tagih" style={{ flex: 1 }}
                  onPress={() => {
                    if (!a.phone) return toast("Nomor HP penghuni belum diisi", "error");
                    openWhatsApp(a.phone, billingMessage({ kosName: data.kosName, name: a.name, room: a.room_number, period, price: a.price, paid: a.paid }));
                  }} />
                <Button testID={`arrear-${a.tenant_id}-pay`} size="sm" variant="secondary" icon="cash-outline" title="Catat Bayar" style={{ flex: 1 }}
                  onPress={() => router.push({ pathname: "/payment-form", params: { tenantId: String(a.tenant_id) } })} />
              </View>
            </Card>
          ))}

          <SectionTitle title="Pembayaran Terakhir" action="Lihat semua" onAction={() => router.navigate("/finance")} testID="recent-see-all" />
          {data.recent.length === 0 ? (
            <Text style={s.muted}>Belum ada pembayaran tercatat.</Text>
          ) : (
            <Card style={{ paddingVertical: sp.xs }}>
              {data.recent.map((p, i) => (
                <Pressable key={p.id} testID={`recent-payment-${p.id}`} onPress={() => router.push(`/receipt/${p.id}`)} style={[s.recentRow, i > 0 && s.recentBorder]}>
                  <View style={s.recentIcon}><Icon name="arrow-down" size={18} color={colors.success} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentTitle} numberOfLines={1}>{p.tenant_name} · Kamar {p.room_number ?? "-"}</Text>
                    <Text style={s.recentSub}>{formatDate(p.pay_date)} · {periodLabel(p.period)}</Text>
                  </View>
                  <Text style={s.recentAmt}>{rupiah(p.amount)}</Text>
                </Pressable>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: sp.lg, paddingBottom: sp.md, gap: sp.md },
  hello: { fontSize: fs.base, color: c.muted },
  kosName: { fontSize: fs.xxl, fontWeight: "800", color: c.onSurface, letterSpacing: -0.3 },
  banner: { flexDirection: "row", alignItems: "center", gap: sp.md, marginBottom: sp.lg, backgroundColor: c.warningSoft, borderColor: c.warningSoft },
  bannerTitle: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  bannerSub: { fontSize: fs.sm, color: c.onSurfaceTertiary, marginTop: 2 },
  hero: { borderRadius: rad.lg, padding: sp.xl },
  heroLabel: { color: c.onBrand, opacity: 0.85, fontSize: fs.base, fontWeight: "600" },
  heroValue: { color: c.onBrand, fontSize: fs.hero, fontWeight: "800", marginTop: sp.xs, letterSpacing: -0.5 },
  heroRow: { flexDirection: "row", marginTop: sp.lg, paddingTop: sp.lg, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", gap: sp.lg },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  heroSmallLabel: { color: c.onBrand, opacity: 0.8, fontSize: fs.sm },
  heroSmallValue: { color: c.onBrand, fontSize: fs.lg, fontWeight: "700", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: sp.md, marginTop: sp.lg },
  stat: { width: "48%", flexGrow: 1, backgroundColor: c.surfaceSecondary, borderRadius: rad.lg, padding: sp.lg, borderWidth: 1, borderColor: c.border },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontWeight: "800", color: c.onSurface, marginTop: sp.sm },
  statLabel: { fontSize: fs.base, color: c.muted, fontWeight: "600" },
  action: { width: 96, backgroundColor: c.surfaceSecondary, borderRadius: rad.lg, padding: sp.md, alignItems: "center", borderWidth: 1, borderColor: c.border, flexShrink: 0 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: sp.sm },
  actionLabel: { fontSize: fs.sm, fontWeight: "700", color: c.onSurface, textAlign: "center" },
  okCard: { flexDirection: "row", alignItems: "center", gap: sp.md },
  okText: { flex: 1, fontSize: fs.base, color: c.onSurfaceTertiary },
  arrear: { marginBottom: sp.md },
  roomTile: { width: 48, height: 48, borderRadius: rad.md, backgroundColor: c.errorSoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  roomTileText: { fontSize: fs.lg, fontWeight: "800", color: c.error },
  arrearName: { fontSize: fs.lg, fontWeight: "700", color: c.onSurface },
  arrearSub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  arrearActions: { flexDirection: "row", gap: sp.sm, marginTop: sp.md },
  muted: { color: c.muted, fontSize: fs.base },
  recentRow: { flexDirection: "row", alignItems: "center", gap: sp.md, paddingVertical: sp.md },
  recentBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  recentIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.successSoft, alignItems: "center", justifyContent: "center" },
  recentTitle: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  recentSub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  recentAmt: { fontSize: fs.base, fontWeight: "800", color: c.success },
}));
