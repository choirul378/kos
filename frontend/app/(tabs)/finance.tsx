import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listFinance, monthSummary } from "@/src/db/repo";
import { currentPeriod, formatDate, periodLabel, rupiah, shiftPeriod } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";
import { Button, Card, EmptyState, ErrorState, fs, Header, Icon, Loading, MonthPicker, Segmented, sp } from "@/src/ui";

type Tab = "masuk" | "keluar" | "rekap";

async function loadRecap(period: string) {
  const months = Array.from({ length: 6 }, (_, i) => shiftPeriod(period, i - 5));
  return Promise.all(months.map(async (m) => ({ period: m, ...(await monthSummary(m)) })));
}

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const router = useRouter();
  const [period, setPeriod] = useState(currentPeriod());
  const [tab, setTab] = useState<Tab>("masuk");
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data, loading, error, refreshing, refresh, reload } = useFocusData(async () => {
    const [summary, masuk, keluar, recap] = await Promise.all([
      monthSummary(period), listFinance(period, "masuk"), listFinance(period, "keluar"), loadRecap(period),
    ]);
    return { summary, masuk, keluar, recap };
  }, [period]);

  const items = tab === "masuk" ? data?.masuk : data?.keluar;
  const maxBar = Math.max(1, ...(data?.recap ?? []).flatMap((r) => [r.income, r.expense]));

  return (
    <View style={s.root} testID="finance-screen">
      <Header title="Keuangan" subtitle="Arus kas bulanan" />
      <View style={{ paddingHorizontal: sp.lg }}>
        <MonthPicker testID="finance-month" value={period} onChange={setPeriod} />
      </View>
      {loading ? <Loading /> : error || !data ? <ErrorState message={error ?? ""} onRetry={reload} /> : (
        <ScrollView
          contentContainerStyle={{ padding: sp.lg, paddingBottom: sp.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPrimary} />}
        >
          <Card style={s.summary} testID="finance-summary">
            <Text style={s.sumLabel}>Saldo Bersih {periodLabel(period)}</Text>
            <Text testID="finance-net-value" style={[s.sumValue, { color: data.summary.net < 0 ? colors.error : colors.brandPrimary }]}>{rupiah(data.summary.net)}</Text>
            <View style={s.sumRow}>
              <View style={s.sumCol}>
                <View style={[s.dot, { backgroundColor: colors.success }]} />
                <View>
                  <Text style={s.sumSmall}>Pemasukan</Text>
                  <Text testID="finance-income-value" style={[s.sumAmt, { color: colors.success }]}>{rupiah(data.summary.income)}</Text>
                </View>
              </View>
              <View style={s.sumCol}>
                <View style={[s.dot, { backgroundColor: colors.error }]} />
                <View>
                  <Text style={s.sumSmall}>Pengeluaran</Text>
                  <Text testID="finance-expense-value" style={[s.sumAmt, { color: colors.error }]}>{rupiah(data.summary.expense)}</Text>
                </View>
              </View>
            </View>
          </Card>

          <View style={{ marginTop: sp.lg }}>
            <Segmented<Tab> testIDPrefix="finance-tab" value={tab} onChange={setTab}
              options={[{ value: "masuk", label: "Pemasukan" }, { value: "keluar", label: "Pengeluaran" }, { value: "rekap", label: "Rekap" }]} />
          </View>

          {tab === "rekap" ? (
            <View style={{ marginTop: sp.lg, gap: sp.lg }}>
              <Card testID="recap-detail">
                <Text style={s.cardTitle}>Rincian {periodLabel(period)}</Text>
                <RecapRow label="Sewa kamar" value={data.summary.rent} />
                <RecapRow label="Pemasukan lain" value={data.summary.otherIncome} />
                <RecapRow label="Total pemasukan" value={data.summary.income} bold />
                {data.summary.byCategory.map((c) => <RecapRow key={c.category} label={`− ${c.category}`} value={-c.total} />)}
                <RecapRow label="Total pengeluaran" value={-data.summary.expense} bold />
                <RecapRow label="Saldo bersih" value={data.summary.net} bold />
              </Card>
              <Card testID="recap-chart">
                <Text style={s.cardTitle}>6 Bulan Terakhir</Text>
                <View style={s.legend}>
                  <View style={[s.dot, { backgroundColor: colors.success }]} /><Text style={s.sumSmall}>Masuk</Text>
                  <View style={[s.dot, { backgroundColor: colors.error, marginLeft: sp.md }]} /><Text style={s.sumSmall}>Keluar</Text>
                </View>
                <View style={s.chart}>
                  {data.recap.map((r) => (
                    <Pressable key={r.period} style={s.barCol} onPress={() => setPeriod(r.period)}>
                      <View style={s.bars}>
                        <View style={[s.bar, { height: Math.max(2, (r.income / maxBar) * 120), backgroundColor: colors.success }]} />
                        <View style={[s.bar, { height: Math.max(2, (r.expense / maxBar) * 120), backgroundColor: colors.error }]} />
                      </View>
                      <Text style={[s.barLabel, r.period === period && { color: colors.brandPrimary, fontWeight: "800" }]}>{periodLabel(r.period).slice(0, 3)}</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            </View>
          ) : !items?.length ? (
            <EmptyState testID={`finance-empty-${tab}`} icon={tab === "masuk" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
              title={tab === "masuk" ? "Belum ada pemasukan" : "Belum ada pengeluaran"}
              message={tab === "masuk" ? "Pembayaran sewa & pemasukan lain bulan ini akan tampil di sini." : "Catat biaya listrik, air, internet, perbaikan, dan lainnya."}
              actionLabel={tab === "masuk" ? "Catat Pemasukan" : "Catat Pengeluaran"}
              onAction={() => router.push({ pathname: "/cash-form", params: { type: tab } })} />
          ) : (
            <Card style={{ marginTop: sp.lg, paddingVertical: sp.xs }}>
              {items.map((it, i) => {
                const isIn = it.kind !== "keluar";
                return (
                  <Pressable key={it.key} testID={`finance-item-${it.key}`} style={[s.row, i > 0 && s.rowBorder]}
                    onPress={() => it.kind === "sewa" ? router.push(`/receipt/${it.id}`) : router.push({ pathname: "/cash-form", params: { id: String(it.id) } })}>
                    <View style={[s.rowIcon, { backgroundColor: isIn ? colors.successSoft : colors.errorSoft }]}>
                      <Icon name={it.kind === "sewa" ? "home-outline" : isIn ? "arrow-down" : "arrow-up"} size={18} color={isIn ? colors.success : colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>{it.title}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>{formatDate(it.date)} · {it.subtitle}</Text>
                    </View>
                    <Text style={[s.rowAmt, { color: isIn ? colors.success : colors.error }]}>{isIn ? "+" : "−"}{rupiah(it.amount)}</Text>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </ScrollView>
      )}
      <View style={[s.footer, { paddingBottom: bottomChrome + sp.md }]}>
        <Button testID="finance-add-income" variant="secondary" icon="arrow-down-circle-outline" title="Pemasukan" style={{ flex: 1 }}
          onPress={() => router.push({ pathname: "/cash-form", params: { type: "masuk" } })} />
        <Button testID="finance-add-expense" icon="arrow-up-circle-outline" title="Pengeluaran" style={{ flex: 1 }}
          onPress={() => router.push({ pathname: "/cash-form", params: { type: "keluar" } })} />
      </View>
    </View>
  );
}

function RecapRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const s = useStyles();
  return (
    <View style={s.recapRow}>
      <Text style={[s.recapLabel, bold && s.recapBold]}>{label}</Text>
      <Text style={[s.recapValue, bold && s.recapBold]}>{rupiah(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  summary: { padding: sp.xl },
  sumLabel: { fontSize: fs.base, color: c.muted, fontWeight: "600" },
  sumValue: { fontSize: 28, fontWeight: "800", marginTop: sp.xs },
  sumRow: { flexDirection: "row", marginTop: sp.lg, gap: sp.lg },
  sumCol: { flex: 1, flexDirection: "row", gap: sp.sm, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  sumSmall: { fontSize: fs.sm, color: c.muted },
  sumAmt: { fontSize: fs.lg, fontWeight: "800" },
  cardTitle: { fontSize: fs.lg, fontWeight: "700", color: c.onSurface, marginBottom: sp.sm },
  recapRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: sp.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  recapLabel: { fontSize: fs.base, color: c.onSurfaceTertiary },
  recapValue: { fontSize: fs.base, color: c.onSurface },
  recapBold: { fontWeight: "800", color: c.onSurface },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  chart: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 150, marginTop: sp.md },
  barCol: { alignItems: "center", flex: 1 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 124 },
  bar: { width: 12, borderRadius: 4 },
  barLabel: { fontSize: fs.sm, color: c.muted, marginTop: sp.xs },
  row: { flexDirection: "row", alignItems: "center", gap: sp.md, paddingVertical: sp.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  rowAmt: { fontSize: fs.base, fontWeight: "800" },
  footer: { flexDirection: "row", gap: sp.md, paddingHorizontal: sp.lg, paddingTop: sp.md, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
}));
