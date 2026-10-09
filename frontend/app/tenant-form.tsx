import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTenant, listRooms, Room, saveTenant, TenantStatus } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { isValidDate, rupiah, todayISO } from "@/src/format";
import { persistKtpPhoto } from "@/src/share";
import { makeStyles, useTheme } from "@/src/theme";
import { Button, Chips, Field, fs, Header, Icon, Label, Loading, rad, sp } from "@/src/ui";

export default function TenantForm() {
  const { id, roomId } = useLocalSearchParams<{ id?: string; roomId?: string }>();
  const editId = id ? Number(id) : undefined;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useStyles();
  const { toast, confirm } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ktp, setKtp] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [room, setRoom] = useState<string>(roomId ?? "none");
  const [status, setStatus] = useState<TenantStatus>("aktif");
  const [exitDate, setExitDate] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const all = await listRooms();
      let current: number | null = null;
      if (editId) {
        const t = await getTenant(editId);
        if (t) {
          setName(t.name); setPhone(t.phone); setKtp(t.ktp_photo); setEntryDate(t.entry_date);
          setRoom(t.room_id ? String(t.room_id) : "none"); setStatus(t.status); setExitDate(t.exit_date); setNotes(t.notes);
          current = t.room_id;
        }
      }
      setRooms(all.filter((r) => r.status === "kosong" || r.id === current || String(r.id) === roomId));
      setLoading(false);
    })();
  }, [editId, roomId]);

  const pickFrom = async (source: "camera" | "library") => {
    try {
      if (source === "camera") {
        if (Platform.OS !== "web") {
          const perm = await ImagePicker.getCameraPermissionsAsync();
          if (!perm.granted) {
            if (!perm.canAskAgain) {
              const go = await confirm({ title: "Izin kamera dinonaktifkan", message: "Buka Pengaturan dan izinkan kamera untuk memotret KTP penghuni. Anda tetap bisa memilih foto dari galeri.", confirmText: "Buka Pengaturan" });
              if (go) Linking.openSettings();
              return;
            }
            const ok = await confirm({ title: "Izinkan akses kamera", message: "Kamera dipakai untuk memotret KTP penghuni. Foto hanya disimpan di HP ini.", confirmText: "Izinkan" });
            if (!ok) return;
            const req = await ImagePicker.requestCameraPermissionsAsync();
            if (!req.granted) {
              const go = !req.canAskAgain && await confirm({ title: "Izin kamera ditolak", message: "Aktifkan izin kamera melalui Pengaturan, atau pilih foto dari galeri.", confirmText: "Buka Pengaturan" });
              if (go) Linking.openSettings();
              return;
            }
          }
        }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6, allowsEditing: true, base64: Platform.OS === "web" });
        if (!res.canceled) setKtp(await persistKtpPhoto(res.assets[0].uri, res.assets[0].base64));
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, allowsEditing: true, base64: Platform.OS === "web" });
        if (!res.canceled) setKtp(await persistKtpPhoto(res.assets[0].uri, res.assets[0].base64));
      }
    } catch (e: any) {
      toast(e?.message ?? "Gagal mengambil foto", "error");
    }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nama lengkap wajib diisi";
    if (!isValidDate(entryDate)) e.entry = "Format tanggal: TTTT-BB-HH (contoh 2026-06-01)";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const newId = await saveTenant({
        name, phone, ktp_photo: ktp, entry_date: entryDate, room_id: room === "none" ? null : Number(room),
        status, exit_date: exitDate, notes,
      }, editId);
      toast(editId ? "Data penghuni diperbarui" : "Penghuni ditambahkan");
      if (editId) router.back(); else router.replace(`/tenant/${newId}`);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root} testID="tenant-form-screen">
      <Header back title={editId ? "Edit Penghuni" : "Penghuni Baru"} />
      {loading ? <Loading /> : (
        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
          <Field testID="tenant-name-input" label="Nama Lengkap *" value={name} onChangeText={setName} placeholder="Sesuai KTP" error={errors.name} autoCapitalize="words" />
          <Field testID="tenant-phone-input" label="Nomor HP / WhatsApp" value={phone} onChangeText={setPhone} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" />

          <Label>Foto KTP</Label>
          <View style={s.ktpBox} testID="tenant-ktp-box">
            {ktp ? (
              <>
                <Image source={{ uri: ktp }} style={s.ktpImg} contentFit="cover" />
                <Pressable testID="tenant-ktp-remove" style={s.ktpRemove} onPress={() => setKtp(null)}>
                  <Icon name="close" size={18} color={colors.onSurfaceInverse} />
                </Pressable>
              </>
            ) : (
              <View style={s.ktpEmpty}>
                <Icon name="card-outline" size={32} color={colors.muted} />
                <Text style={s.ktpHint}>Belum ada foto KTP</Text>
              </View>
            )}
          </View>
          <View style={s.ktpBtns}>
            <Button testID="tenant-ktp-camera" size="sm" variant="secondary" icon="camera-outline" title="Kamera" style={{ flex: 1 }} onPress={() => pickFrom("camera")} />
            <Button testID="tenant-ktp-gallery" size="sm" variant="secondary" icon="image-outline" title="Galeri" style={{ flex: 1 }} onPress={() => pickFrom("library")} />
          </View>

          <Field testID="tenant-entry-date-input" label="Tanggal Masuk *" value={entryDate} onChangeText={setEntryDate} placeholder="2026-06-01" error={errors.entry} hint="Format TTTT-BB-HH" />

          <Label>Pilih Kamar</Label>
          <View style={s.chipWrap}>
            <Chips testIDPrefix="tenant-room" edge={0} value={room} onChange={setRoom}
              options={[{ value: "none", label: "Belum ada" }, ...rooms.map((r) => ({ value: String(r.id), label: `Kmr ${r.number} · ${rupiah(r.price)}` }))]} />
          </View>
          {rooms.length === 0 && <Text style={s.hint}>Tidak ada kamar kosong. Tambah kamar terlebih dahulu di tab Kamar.</Text>}

          {!!editId && (
            <>
              <Label>Status Penghuni</Label>
              <View style={s.chipWrap}>
                <Chips<TenantStatus> testIDPrefix="tenant-status" edge={0} value={status} onChange={setStatus}
                  options={[{ value: "aktif", label: "Aktif" }, { value: "alumni", label: "Alumni / Keluar" }]} />
              </View>
            </>
          )}
          <Field testID="tenant-notes-input" label="Catatan" value={notes} onChangeText={setNotes} placeholder="Asal, pekerjaan, kontak darurat…" multiline />
          <Button testID="tenant-save-button" title={editId ? "Simpan Perubahan" : "Simpan Penghuni"} icon="checkmark" loading={saving} onPress={submit} />
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  chipWrap: { marginTop: -sp.sm, marginBottom: sp.sm },
  hint: { fontSize: fs.sm, color: c.warning, marginBottom: sp.lg },
  ktpBox: { height: 180, borderRadius: rad.md, backgroundColor: c.surfaceTertiary, overflow: "hidden", borderWidth: 1, borderColor: c.border, borderStyle: "dashed" },
  ktpImg: { width: "100%", height: "100%" },
  ktpEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: sp.xs },
  ktpHint: { color: c.muted, fontSize: fs.base },
  ktpRemove: { position: "absolute", top: sp.sm, right: sp.sm, width: 36, height: 36, borderRadius: 18, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" },
  ktpBtns: { flexDirection: "row", gap: sp.sm, marginTop: sp.sm, marginBottom: sp.lg },
}));
