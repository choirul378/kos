import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listRooms, Room, RoomStatus } from "@/src/db/repo";
import { rupiah } from "@/src/format";
import { useFocusData } from "@/src/hooks";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";
import { Badge, Card, Chips, EmptyState, ErrorState, Fab, fs, Header, Icon, Loading, rad, sp } from "@/src/ui";

type Filter = "semua" | RoomStatus;

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const [filter, setFilter] = useState<Filter>(params.filter ?? "semua");
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  useEffect(() => { if (params.filter) setFilter(params.filter); }, [params.filter]);

  const { data, loading, error, refreshing, refresh, reload } = useFocusData(() => listRooms(), []);
  const rooms = (data ?? []).filter((r) => filter === "semua" || r.status === filter);

  const renderItem = ({ item }: { item: Room }) => {
    const filled = item.status === "terisi";
    return (
      <Card testID={`room-card-${item.id}`} style={s.card} onPress={() => router.push(`/room/${item.id}`)}>
        <View style={[s.tile, { backgroundColor: filled ? colors.brandTertiary : colors.surfaceTertiary }]}>
          <Text style={s.tileLabel}>Kamar</Text>
          <Text style={[s.tileNum, { color: filled ? colors.onBrandTertiary : colors.onSurface }]} numberOfLines={1} adjustsFontSizeToFit>{item.number}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={s.rowBetween}>
            <Text style={s.type} numberOfLines={1}>{item.type || "Kamar Standar"}</Text>
            <Badge testID={`room-card-${item.id}-status`} label={filled ? "Terisi" : "Kosong"} tone={filled ? "success" : "info"} />
          </View>
          <Text style={s.price}>{rupiah(item.price)}<Text style={s.per}> /bulan</Text></Text>
          <View style={s.metaRow}>
            <Icon name={filled ? "person" : "sparkles-outline"} size={14} color={colors.muted} />
            <Text style={s.meta} numberOfLines={1}>{item.tenant_name ?? (item.facilities || "Siap ditempati")}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={s.root} testID="rooms-screen">
      <Header title="Kamar" subtitle={data ? `${data.length} kamar · ${data.filter((r) => r.status === "kosong").length} kosong` : undefined} />
      <Chips<Filter>
        testIDPrefix="rooms-filter"
        value={filter}
        onChange={setFilter}
        options={[{ value: "semua", label: "Semua" }, { value: "kosong", label: "Kosong" }, { value: "terisi", label: "Terisi" }]}
      />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: sp.lg, paddingTop: sp.xs, paddingBottom: bottomChrome + 96, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState testID="rooms-empty" icon="bed-outline"
              title={filter === "semua" ? "Belum ada kamar" : `Tidak ada kamar ${filter}`}
              message="Tambahkan kamar kos Anda beserta harga sewa dan fasilitasnya."
              actionLabel="Tambah Kamar" onAction={() => router.push("/room-form")} />
          }
        />
      )}
      <Fab testID="rooms-add-fab" label="Kamar" bottom={bottomChrome + sp.lg} onPress={() => router.push("/room-form")} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  card: { flexDirection: "row", gap: sp.md, marginBottom: sp.md, alignItems: "center", padding: sp.md },
  tile: { width: 64, height: 64, borderRadius: rad.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tileLabel: { fontSize: 10, color: c.muted, fontWeight: "600" },
  tileNum: { fontSize: fs.xl, fontWeight: "800" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: sp.sm },
  type: { fontSize: fs.base, fontWeight: "600", color: c.onSurfaceTertiary, flex: 1 },
  price: { fontSize: fs.lg, fontWeight: "800", color: c.onSurface },
  per: { fontSize: fs.sm, fontWeight: "500", color: c.muted },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: fs.sm, color: c.muted, flex: 1 },
}));
