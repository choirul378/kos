import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listTenants, Tenant, TenantStatus } from "@/src/db/repo";
import { formatDate } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";
import { Avatar, Badge, Card, Chips, EmptyState, ErrorState, Fab, fs, Header, Icon, Loading, rad, sp } from "@/src/ui";

type Filter = "semua" | TenantStatus;

export default function TenantsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("aktif");
  const [q, setQ] = useState("");
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data, loading, error, refreshing, refresh, reload } = useFocusData(
    () => listTenants(filter === "semua" ? undefined : filter, q), [filter, q],
  );

  const renderItem = ({ item }: { item: Tenant }) => (
    <Card testID={`tenant-card-${item.id}`} style={s.card} onPress={() => router.push(`/tenant/${item.id}`)}>
      <Avatar name={item.name} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>{item.name}</Text>
        <View style={s.metaRow}>
          <Icon name="call-outline" size={13} color={colors.muted} />
          <Text style={s.meta} numberOfLines={1}>{item.phone || "-"}</Text>
        </View>
        <Text style={s.meta}>Masuk {formatDate(item.entry_date)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: sp.xs }}>
        <View style={s.roomPill}><Text style={s.roomPillText}>{item.room_number ? `Kmr ${item.room_number}` : "Tanpa kamar"}</Text></View>
        <Badge label={item.status === "aktif" ? "Aktif" : "Alumni"} tone={item.status === "aktif" ? "success" : "neutral"} />
      </View>
    </Card>
  );

  return (
    <View style={s.root} testID="tenants-screen">
      <Header title="Penghuni" subtitle={data ? `${data.length} penghuni ditampilkan` : undefined} />
      <View style={s.searchWrap}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput testID="tenants-search-input" value={q} onChangeText={setQ} placeholder="Cari nama, no. HP, atau kamar"
          placeholderTextColor={colors.muted} style={s.search} returnKeyType="search" />
      </View>
      <Chips<Filter>
        testIDPrefix="tenants-filter" value={filter} onChange={setFilter}
        options={[{ value: "aktif", label: "Aktif" }, { value: "alumni", label: "Alumni / Keluar" }, { value: "semua", label: "Semua" }]}
      />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: sp.lg, paddingTop: sp.xs, paddingBottom: bottomChrome + 96, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="tenants-empty" icon="people-outline"
              title={q ? "Tidak ditemukan" : "Belum ada penghuni"}
              message={q ? "Coba kata kunci lain." : "Catat data penghuni lengkap dengan foto KTP dan kamarnya."}
              actionLabel={q ? undefined : "Tambah Penghuni"} onAction={() => router.push("/tenant-form")} />
          }
        />
      )}
      <Fab testID="tenants-add-fab" label="Penghuni" icon="person-add" bottom={bottomChrome + sp.lg} onPress={() => router.push("/tenant-form")} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: sp.sm, marginHorizontal: sp.lg, backgroundColor: c.surfaceTertiary, borderRadius: rad.md, paddingHorizontal: sp.md, height: 48 },
  search: { flex: 1, fontSize: fs.base, color: c.onSurface, height: 48 },
  card: { flexDirection: "row", gap: sp.md, alignItems: "center", marginBottom: sp.md, padding: sp.md },
  name: { fontSize: fs.lg, fontWeight: "700", color: c.onSurface },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  roomPill: { backgroundColor: c.brandTertiary, borderRadius: rad.sm, paddingHorizontal: sp.sm, paddingVertical: 3 },
  roomPillText: { color: c.onBrandTertiary, fontSize: fs.sm, fontWeight: "700" },
}));
