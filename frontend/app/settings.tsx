import { useRouter } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import { Platform, Pressable, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrinterSettings } from "@/src/components/PrinterSettings";
import { exportAll, importAll, validateBackup } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { formatDate } from "@/src/format";
import { useLock } from "@/src/lock";
import { getProfile, saveProfile } from "@/src/settings";
import { attachKtpPhotos, pickBackupFile, restoreKtpPhotos, saveBackupToFolder, shareBackup } from "@/src/share";
import { makeStyles, useTheme } from "@/src/theme";
import { Button, Card, Field, fs, haptic, Header, Icon, IconName, sp } from "@/src/ui";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useStyles();
  const { toast, confirm } = useFeedback();
  const { hasPin, bioEnabled, bioAvailable, setBio, removePin, lockNow } = useLock();
  const [kosName, setKosName] = useState("");
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { getProfile().then((p) => { setKosName(p.kosName); setOwner(p.ownerName); }); }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e: any) { toast(e?.message ?? "Terjadi kesalahan", "error"); } finally { setBusy(null); }
  };

  const doExport = (toFolder: boolean) => run(toFolder ? "folder" : "share", async () => {
    const data = await attachKtpPhotos(await exportAll());
    const photoCount = Object.keys(data.photos ?? {}).length;
    const json = JSON.stringify(data);
    const name = toFolder ? await saveBackupToFolder(json) : await shareBackup(json);
    if (name) toast(`Backup dibuat: ${data.rooms.length} kamar, ${data.tenants.length} penghuni, ${photoCount} foto KTP`);
  });

  const doImport = () => run("import", async () => {
    const text = await pickBackupFile();
    if (!text) return;
    let obj: unknown;
    try { obj = JSON.parse(text); } catch { throw new Error("File bukan backup JSON yang valid"); }
    if (!validateBackup(obj)) throw new Error("File bukan backup DSKos");
    const photoCount = Object.keys(obj.photos ?? {}).length;
    const ok = await confirm({
      title: "Pulihkan data dari backup?",
      message: `Backup tanggal ${formatDate(obj.exported_at)} berisi ${obj.rooms.length} kamar, ${obj.tenants.length} penghuni, ${obj.payments.length} pembayaran, ${photoCount} foto KTP. SEMUA data saat ini akan diganti.`,
      confirmText: "Ganti & Pulihkan", destructive: true,
    });
    if (!ok) return;
    await importAll(await restoreKtpPhotos(obj));
    toast("Data berhasil dipulihkan");
  });

  return (
    <View style={s.root} testID="settings-screen">
      <Header back title="Pengaturan" />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
        <Text style={s.group}>PROFIL KOS</Text>
        <Card>
          <Field testID="settings-kos-name-input" label="Nama Kos" value={kosName} onChangeText={setKosName} placeholder="Kos Melati" />
          <Field testID="settings-owner-input" label="Nama Pemilik / Pengelola" value={owner} onChangeText={setOwner} placeholder="Dipakai di kuitansi" />
          <Button testID="settings-profile-save" size="sm" title="Simpan Profil" icon="checkmark" onPress={async () => { await saveProfile(kosName, owner); toast("Profil disimpan"); }} />
        </Card>

        <Text style={s.group}>KEAMANAN</Text>
        <Card style={{ paddingVertical: sp.xs }}>
          <Row testID="settings-pin-row" icon="keypad-outline" title={hasPin ? "Ubah PIN" : "Atur PIN"} sub={hasPin ? "PIN aktif saat aplikasi dibuka" : "Belum aktif"} onPress={() => router.push("/pin-setup")} />
          {hasPin && (
            <Row testID="settings-bio-row" icon="finger-print" title="Sidik Jari / Face ID" sub={bioAvailable ? "Buka aplikasi tanpa mengetik PIN" : "Tidak tersedia di perangkat ini"}
              right={<Switch testID="settings-bio-switch" value={bioEnabled} disabled={!bioAvailable} onValueChange={(v) => { haptic("select"); setBio(v); }}
                trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} thumbColor={colors.surfaceSecondary} />} />
          )}
          {hasPin && <Row testID="settings-lock-now" icon="lock-closed-outline" title="Kunci Sekarang" onPress={lockNow} />}
          {hasPin && (
            <Row testID="settings-remove-pin" icon="lock-open-outline" title="Nonaktifkan PIN" danger
              onPress={async () => { if (await confirm({ title: "Nonaktifkan PIN?", message: "Siapa pun yang memegang HP ini bisa membuka data kos Anda.", confirmText: "Nonaktifkan", destructive: true })) { await removePin(); toast("PIN dinonaktifkan"); } }} />
          )}
        </Card>

        <Text style={s.group}>BACKUP & RESTORE</Text>
        <Card>
          <View style={s.note}>
            <Icon name="information-circle-outline" size={20} color={colors.info} />
            <Text style={s.noteText}>Semua data tersimpan offline di HP ini. Buat backup .json secara rutin dan simpan di tempat aman (Drive, email, atau flashdisk) untuk antisipasi ganti HP. Foto KTP ikut tersimpan di dalam backup.</Text>
          </View>
          <View style={{ gap: sp.sm }}>
            {Platform.OS === "android" && (
              <Button testID="settings-export-folder" icon="folder-open-outline" title="Simpan Backup ke Folder" loading={busy === "folder"} onPress={() => doExport(true)} />
            )}
            <Button testID="settings-export-share" variant={Platform.OS === "android" ? "secondary" : "primary"} icon="cloud-upload-outline" title={Platform.OS === "web" ? "Unduh Backup (.json)" : "Export & Bagikan Backup"} loading={busy === "share"} onPress={() => doExport(false)} />
            <Button testID="settings-import" variant="ghost" icon="cloud-download-outline" title="Import / Pulihkan dari Backup" loading={busy === "import"} onPress={doImport} />
          </View>
        </Card>

        <Text style={s.group}>PRINTER THERMAL</Text>
        <PrinterSettings />

        <Text style={s.footer}>DSKos v1.0 · 100% offline · Data milik Anda{"\n"}Dibuat oleh: dskode.com</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Row({ icon, title, sub, onPress, right, danger, testID }: { icon: IconName; title: string; sub?: string; onPress?: () => void; right?: ReactNode; danger?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Pressable testID={testID} disabled={!onPress} onPress={() => { haptic(); onPress?.(); }} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <View style={[s.rowIcon, danger && { backgroundColor: colors.errorSoft }]}><Icon name={icon} size={20} color={danger ? colors.error : colors.brandPrimary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, danger && { color: colors.error }]}>{title}</Text>
        {!!sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={20} color={colors.muted} /> : null)}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  group: { fontSize: fs.sm, fontWeight: "700", color: c.muted, letterSpacing: 0.8, marginTop: sp.xl, marginBottom: sp.sm, marginLeft: sp.xs },
  row: { flexDirection: "row", alignItems: "center", gap: sp.md, paddingVertical: sp.md, minHeight: 56 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: fs.lg, fontWeight: "600", color: c.onSurface },
  rowSub: { fontSize: fs.sm, color: c.muted, marginTop: 2 },
  note: { flexDirection: "row", gap: sp.sm, backgroundColor: c.infoSoft, borderRadius: 12, padding: sp.md, marginBottom: sp.lg },
  noteText: { flex: 1, fontSize: fs.sm, color: c.onSurfaceTertiary, lineHeight: 18 },
  footer: { textAlign: "center", color: c.muted, fontSize: fs.sm, marginTop: sp.xl },
}));
