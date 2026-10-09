import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { deleteRoom, getRoom, RoomStatus, saveRoom } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { amountInput, parseAmount } from "@/src/format";
import { makeStyles } from "@/src/theme";
import { Button, Chips, Field, Header, Label, Loading, sp } from "@/src/ui";

const TYPES = ["Standar", "AC", "Non-AC", "KM Dalam", "KM Luar", "VIP"];

export default function RoomForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : undefined;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStyles();
  const { toast, confirm } = useFeedback();
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState("");
  const [type, setType] = useState("Standar");
  const [facilities, setFacilities] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<RoomStatus>("kosong");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editId) return;
    getRoom(editId).then((r) => {
      if (r) {
        setNumber(r.number); setType(r.type); setFacilities(r.facilities);
        setPrice(amountInput(String(r.price))); setStatus(r.status); setNotes(r.notes);
      }
      setLoading(false);
    });
  }, [editId]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!number.trim()) e.number = "Nomor kamar wajib diisi";
    if (!parseAmount(price)) e.price = "Harga sewa wajib diisi";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await saveRoom({ number, type, facilities, price: parseAmount(price), status, notes }, editId);
      toast(editId ? "Kamar diperbarui" : "Kamar ditambahkan");
      router.back();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editId) return;
    const ok = await confirm({ title: `Hapus kamar ${number}?`, message: "Riwayat pembayaran tetap tersimpan, namun tidak terhubung ke kamar ini lagi.", confirmText: "Hapus", destructive: true });
    if (!ok) return;
    try {
      await deleteRoom(editId);
      toast("Kamar dihapus");
      router.dismissTo("/rooms");
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  return (
    <View style={s.root} testID="room-form-screen">
      <Header back title={editId ? "Edit Kamar" : "Tambah Kamar"} />
      {loading ? <Loading /> : (
        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
          <Field testID="room-number-input" label="Nomor Kamar *" value={number} onChangeText={setNumber} placeholder="Contoh: 01 atau A1" error={errors.number} autoCapitalize="characters" />
          <Label>Tipe Kamar</Label>
          <View style={s.chipWrap}>
            <Chips testIDPrefix="room-type" edge={0} value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: t }))} />
          </View>
          <Field testID="room-type-input" label="Tipe (bisa diketik sendiri)" value={type} onChangeText={setType} placeholder="Standar" />
          <Field testID="room-facilities-input" label="Fasilitas" value={facilities} onChangeText={setFacilities} placeholder="Kasur, lemari, meja, WiFi, AC…" multiline />
          <Field testID="room-price-input" label="Harga Sewa / Bulan (Rp) *" value={price} onChangeText={(v) => setPrice(amountInput(v))} placeholder="800.000" keyboardType="number-pad" error={errors.price} />
          <Label>Status</Label>
          <View style={s.chipWrap}>
            <Chips<RoomStatus> testIDPrefix="room-status" edge={0} value={status} onChange={setStatus}
              options={[{ value: "kosong", label: "Kosong" }, { value: "terisi", label: "Terisi" }]} />
          </View>
          <Field testID="room-notes-input" label="Catatan" value={notes} onChangeText={setNotes} placeholder="Opsional" multiline />
          <Button testID="room-save-button" title={editId ? "Simpan Perubahan" : "Simpan Kamar"} icon="checkmark" loading={saving} onPress={submit} />
          {!!editId && <Button testID="room-delete-button" title="Hapus Kamar" icon="trash-outline" variant="danger" onPress={remove} style={{ marginTop: sp.md }} />}
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  chipWrap: { marginTop: -sp.sm, marginBottom: sp.sm },
}));
