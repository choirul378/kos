import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FinanceFilterSheet, Filters, countFilters, hasRange, rangeLabel } from "@/src/components/FinanceFilterSheet";
import { getDb } from "@/src/db/client";
import { listFinance, listRooms, listTenants, monthSummary } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { currentPeriod, formatDate, periodLabel, rupiah, shiftPeriod } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { usesNativeTabs } from "@/src/navigation";
import { monthlyReportHtml } from "@/src/report";
import { getProfile } from "@/src/settings";
import { sharePdf } from "@/src/share";
import { makeStyles, useTheme } from "@/src/theme";
import { Button, Card, EmptyState, ErrorState, fs, Header, Icon, IconButton, Loading, MonthPicker, rad, Segmented, sp } from "@/src/ui";

type Tab = "masuk" | "keluar" | "rekap";

async function loadRecap(period: string) {
  const months = Array.from({ length: 6 }, (_, i) => shiftPeriod(period, i - 5));
  return Promise.all(months.map(async (m) => ({ period: m, ...(await monthSummary(m)) })));
}

async function loadOccupancy() {
  const db = await getDb();
  const r = await db.get<{ total: number; terisi: number | null }>("SELECT COUNT(*) AS total, SUM(CASE WHEN status='terisi' THEN 1 ELSE 0 END) AS terisi FROM rooms");
  return { total: r?.total ?? 0, terisi: r?.terisi ?? 0 };
}

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const router = useRouter();
  const { toast } = useFeedback();
  const [period, setPeriod] = useState(currentPeriod());
  const [tab, setTab] = useState<Tab>("masuk");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const rangeOn = hasRange(filters);
  const partiesOn = tab === "masuk" && !!(filters.roomId || filters.tenantId);
  const filterCount = countFilters(filters, tab === "masuk");
  const listFiltered = tab !== "rekap" && filterCount > 0;

  const { data, loading, error, refreshing, refresh, reload } = useFocusData(async () => {
    const range = rangeOn ? { from: filters.from, to: filters.to } : {};
    const [summary, masuk, keluar, recap, rooms, tenants] = await Promise.all([
      monthSummary(period),
      listFinance({ type: "masuk", period, ...range, roomId: filters.roomId, tenantId: filters.tenantId }),
      listFinance({ type: "keluar", period, ...range }),
      loadRecap(period), listRooms(), listTenants(),
    ]);
    return { summary, masuk, keluar, recap, rooms, tenants };
  }, [period, filters]);

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const [profile, occupancy, summary, masuk, keluar] = await Promise.all([
        getProfile(), loadOccupancy(), monthSummary(period),
        listFinance({ type: "masuk", period }), listFinance({ type: "keluar", period }),
      ]);
      const html = monthlyReportHtml({ period, ...profile, summary, masuk, keluar, occupancy });
      await sharePdf(html, `Laporan-${profile.kosName.replace(/[^\w]+/g, "-")}-${period}`, "Bagikan Laporan Bulanan");
    } catch (e: any) {
      toast(e?.message ?? "Gagal membuat PDF", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  const items = tab === "masuk" ? data?.masuk : data?.keluar;
  const maxBar = Math.max(1, ...(data?.recap ?? []).flatMap((r) => [r.income, r.expense]));
  const sum = (xs?: { amount: number }[]) => (xs ?? []).reduce((a, b) => a + b.amount, 0);
  // Kartu ringkasan mengikuti filter aktif; tanpa filter = rekap bulan terpilih.
  const shown = listFiltered && data
    ? { income: sum(data.masuk), expense: sum(data.keluar) }
    : { income: data?.summary.income ?? 0, expense: data?.summary.expense ?? 0 };
  const shownNet = shown.income - shown.expense;
  const roomName = data?.rooms.find((r) => r.id === filters.roomId)?.number;
  const tenantName = data?.tenants.find((t) => t.id === filters.tenantId)?.name;

  return (
    <View style={s.root} testID="finance-screen">
      <Header title="Keuangan" subtitle="Arus kas bulanan"
        right={<IconButton testID="finance-export-pdf" icon="document-text-outline" label="Export laporan PDF" onPress={exportPdf} />} />
      <View style={{ paddingHorizontal: sp.lg }}>
        {rangeOn && tab !== "rekap" ? (
          <View testID="finance-range" style={s.range}>
            <Icon name="calendar-outline" size={18} color={colors.brandPrimary} />
            <Text testID="finance-range-label" style={s.rangeText} numberOfLines={1}>{rangeLabel(filters)}</Text>
            <IconButton testID="finance-range-clear" icon="close" label="Hapus rentang tanggal" onPress={() => setFilters((f) => ({ ...f, from: undefined, to: undefined }))} />
          </View>
        ) : (
          <MonthPicker testID="finance-month" value={period} onChange={setPeriod} />
        )}
        {tab !== "rekap" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterBar} keyboardShouldPersistTaps="handled">
            <Pressable testID="finance-filter-button" onPress={() => setSheetOpen(true)} style={[s.filterBtn, filterCount > 0 && s.filterBtnActive]}>
              <Icon name="options-outline" size={16} color={filterCount > 0 ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
              <Text style={[s.filterBtnText, filterCount > 0 && { color: colors.onBrandPrimary }]}>Filter{filterCount > 0 ? ` (${filterCount})` : ""}</Text>
            </Pressable>
            {tab === "masuk" && !!filters.roomId && (
              <Pressable testID="finance-chip-room" style={s.chip} onPress={() => setFilters((f) => ({ ...f, roomId: undefined }))}>
                <Text style={s.chipText}>Kamar {roomName ?? ""}</Text><Icon name="close" size={14} color={colors.onBrandTertiary} />
              </Pressable>
            )}
            {tab === "masuk" && !!filters.tenantId && (
              <Pressable testID="finance-chip-tenant" style={s.chip} onPress={() => setFilters((f) => ({ ...f, tenantId: undefined }))}>
                <Text style={s.chipText} numberOfLines={1}>{tenantName ?? "Penghuni"}</Text><Icon name="close" size={14} color={colors.onBrandTertiary} />
              </Pressable>
            )}
          </ScrollView>
        )}
      </View>
      <FinanceFilterSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} value={filters} onApply={setFilters}
        rooms={data?.rooms ?? []} tenants={data?.tenants ?? []} showParties={tab === "masuk"} />
      {loading ? <Loading /> : error || !data ? <ErrorState message={error ?? ""} onRetry={reload} /> : (
        <ScrollView
          contentContainerStyle={{ padding: sp.lg, paddingBottom: sp.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPrimary} />}
        >
          <Card style={s.summary} testID="finance-summary">
            <Text style={s.sumLabel}>{listFiltered ? "Hasil Filter" : `Saldo Bersih ${periodLabel(period)}`}</Text>
            <Text testID="finance-net-value" style={[s.sumValue, { color: shownNet < 0 ? colors.error : colors.brandPrimary }]}>{rupiah(shownNet)}</Text>
            <View style={s.sumRow}>
              <View style={s.sumCol}>
                <View style={[s.dot, { backgroundColor: colors.success }]} />
                <View>
                  <Text style={s.sumSmall}>Pemasukan</Text>
                  <Text testID="finance-income-value" style={[s.sumAmt, { color: colors.success }]}>{rupiah(shown.income)}</Text>
                </View>
              </View>
              <View style={s.sumCol}>
                <View style={[s.dot, { backgroundColor: colors.error }]} />
                <View>
                  <Text style={s.sumSmall}>Pengeluaran</Text>
                  <Text testID="finance-expense-value" style={[s.sumAmt, { color: colors.error }]}>{rupiah(shown.expense)}</Text>
                </View>
              </View>
            </View>
            {partiesOn && <Text testID="finance-filter-note" style={s.note}>Filter kamar/penghuni hanya menampilkan pembayaran sewa.</Text>}
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
                <Button testID="recap-export-pdf" variant="secondary" icon="document-text-outline" title="Export Laporan PDF" loading={pdfBusy}
                  onPress={exportPdf} style={{ marginTop: sp.md }} />
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
            listFiltered ? (
              <EmptyState testID={`finance-empty-${tab}`} icon="funnel-outline" title="Tidak ada transaksi yang cocok"
                message="Coba ubah kamar, penghuni, atau rentang tanggal filter." actionLabel="Reset Filter" onAction={() => setFilters({})} />
            ) : (
            <EmptyState testID={`finance-empty-${tab}`} icon={tab === "masuk" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
              title={tab === "masuk" ? "Belum ada pemasukan" : "Belum ada pengeluaran"}
              message={tab === "masuk" ? "Pembayaran sewa & pemasukan lain bulan ini akan tampil di sini." : "Catat biaya listrik, air, internet, perbaikan, dan lainnya."}
              actionLabel={tab === "masuk" ? "Catat Pemasukan" : "Catat Pengeluaran"}
              onAction={() => router.push({ pathname: "/cash-form", params: { type: tab } })} />
            )
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
  note: { fontSize: fs.sm, color: c.muted, marginTop: sp.md },
  range: { flexDirection: "row", alignItems: "center", gap: sp.sm, backgroundColor: c.brandTertiary, borderRadius: rad.md, paddingLeft: sp.md, padding: sp.xs, borderWidth: 1, borderColor: c.brandTertiary },
  rangeText: { flex: 1, fontSize: fs.lg, fontWeight: "700", color: c.onBrandTertiary },
  filterBar: { flexDirection: "row", alignItems: "center", gap: sp.sm, paddingVertical: sp.sm },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: sp.md, borderRadius: rad.pill, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  filterBtnActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  filterBtnText: { fontSize: fs.base, fontWeight: "700", color: c.onSurfaceTertiary },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: sp.md, borderRadius: rad.pill, backgroundColor: c.brandTertiary, maxWidth: 200 },
  chipText: { fontSize: fs.base, fontWeight: "600", color: c.onBrandTertiary, flexShrink: 1 },
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
