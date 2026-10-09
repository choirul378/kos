import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Room, Tenant } from "@/src/db/repo";
import { formatDate, isValidDate, shiftPeriod, todayISO } from "@/src/format";
import { makeStyles } from "@/src/theme";
import { Button, Chips, Field, fs, Label, rad, sp } from "@/src/ui";

export type Filters = { roomId?: number; tenantId?: number; from?: string; to?: string };

export function hasRange(f: Filters) { return !!(f.from && f.to); }
export function countFilters(f: Filters, withParties: boolean) {
  return (hasRange(f) ? 1 : 0) + (withParties && f.roomId ? 1 : 0) + (withParties && f.tenantId ? 1 : 0);
}
export function rangeLabel(f: Filters) { return `${formatDate(f.from)} – ${formatDate(f.to)}`; }

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Bottom sheet filter riwayat transaksi: kamar, penghuni (hanya pemasukan) & rentang tanggal.
export function FinanceFilterSheet({ visible, onClose, value, onApply, rooms, tenants, showParties }: {
  visible: boolean; onClose: () => void; value: Filters; onApply: (f: Filters) => void;
  rooms: Room[]; tenants: Tenant[]; showParties: boolean;
}) {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const [draft, setDraft] = useState<Filters>(value);
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (visible) { setDraft(value); setFrom(value.from ?? ""); setTo(value.to ?? ""); setErr(""); }
  }, [visible, value]);

  const preset = (f: string, t: string) => { setFrom(f); setTo(t); setErr(""); };
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const lastMonth = shiftPeriod(thisMonth, -1);

  const apply = () => {
    const f = from.trim(), t = to.trim();
    if ((f || t) && !(isValidDate(f) && isValidDate(t))) return setErr("Isi kedua tanggal dengan format YYYY-MM-DD");
    if (f && t && f > t) return setErr("Tanggal awal harus sebelum tanggal akhir");
    onApply({ ...draft, from: f || undefined, to: t || undefined });
    onClose();
  };

  const roomOptions = [{ value: "0", label: "Semua kamar" }, ...rooms.map((r) => ({ value: String(r.id), label: `Kamar ${r.number}` }))];
  const tenantOptions = [{ value: "0", label: "Semua penghuni" }, ...tenants.map((t) => ({ value: String(t.id), label: t.name }))];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable testID="finance-filter-sheet" style={[s.sheet, { paddingBottom: insets.bottom + sp.lg }]} onPress={() => {}}>
          <View style={s.grabber} />
          <Text style={s.title}>Filter Riwayat</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            <Label>Rentang tanggal</Label>
            <View style={s.presets}>
              <Button testID="filter-preset-7" size="sm" variant="ghost" title="7 hari" onPress={() => preset(daysAgo(6), today)} />
              <Button testID="filter-preset-30" size="sm" variant="ghost" title="30 hari" onPress={() => preset(daysAgo(29), today)} />
              <Button testID="filter-preset-lastmonth" size="sm" variant="ghost" title="Bulan lalu" onPress={() => preset(`${lastMonth}-01`, `${lastMonth}-${new Date(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7)), 0).getDate()}`)} />
            </View>
            <View style={s.dates}>
              <View style={{ flex: 1 }}>
                <Field testID="filter-from" label="Dari" value={from} onChangeText={(v) => { setFrom(v); setErr(""); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Field testID="filter-to" label="Sampai" value={to} onChangeText={(v) => { setTo(v); setErr(""); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
            </View>
            {!!err && <Text testID="filter-error" style={s.err}>{err}</Text>}
            {showParties && (
              <>
                <Label>Kamar</Label>
                <Chips testIDPrefix="filter-room" edge={0} value={String(draft.roomId ?? 0)} options={roomOptions}
                  onChange={(v) => setDraft((d) => ({ ...d, roomId: Number(v) || undefined }))} />
                <Label>Penghuni</Label>
                <Chips testIDPrefix="filter-tenant" edge={0} value={String(draft.tenantId ?? 0)} options={tenantOptions}
                  onChange={(v) => setDraft((d) => ({ ...d, tenantId: Number(v) || undefined }))} />
              </>
            )}
          </ScrollView>
          <View style={s.row}>
            <Button testID="filter-reset" variant="ghost" title="Reset" onPress={() => { onApply({}); onClose(); }} style={{ flex: 1 }} />
            <Button testID="filter-apply" title="Terapkan" icon="checkmark" onPress={apply} style={{ flex: 2 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: rad.lg, borderTopRightRadius: rad.lg, padding: sp.xl, paddingTop: sp.md },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, alignSelf: "center", marginBottom: sp.lg },
  title: { fontSize: fs.xl, fontWeight: "800", color: c.onSurface, marginBottom: sp.md },
  presets: { flexDirection: "row", gap: sp.sm, marginBottom: sp.md },
  dates: { flexDirection: "row", gap: sp.md },
  err: { fontSize: fs.sm, color: c.error, marginTop: -sp.sm, marginBottom: sp.sm },
  row: { flexDirection: "row", gap: sp.md, marginTop: sp.md },
}));
