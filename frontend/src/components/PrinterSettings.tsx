import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { PairedDevice } from "@/modules/bt-printer";
import { useFeedback } from "../feedback";
import { getPrinterConfig, listPairedPrinters, PaperWidth, printerSupported, printTest, savePaperWidth, savePrinter, showPrintError } from "../thermal";
import { makeStyles, useTheme } from "../theme";
import { Button, Card, fs, haptic, Icon, Label, rad, Segmented, sp } from "../ui";

export function PrinterSettings() {
  const { colors } = useTheme();
  const s = useStyles();
  const fb = useFeedback();
  const { toast } = fb;
  const [width, setWidth] = useState<PaperWidth>(58);
  const [current, setCurrent] = useState({ name: "", address: "" });
  const [devices, setDevices] = useState<PairedDevice[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { getPrinterConfig().then((c) => { setWidth(c.width); setCurrent(c); }); }, []);

  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    try { await fn(); } catch (e: any) { setBusy(null); await showPrintError(e, fb); } finally { setBusy(null); }
  };

  const pick = async (d: PairedDevice) => {
    haptic("select");
    await savePrinter(d);
    setCurrent(d);
    setDevices(null);
    toast(`Printer dipilih: ${d.name}`);
  };

  return (
    <Card testID="printer-settings">
      {!printerSupported() && (
        <View style={s.note}>
          <Icon name="information-circle-outline" size={20} color={colors.info} />
          <Text style={s.noteText}>Cetak ke printer thermal Bluetooth hanya tersedia di aplikasi Android (APK). Pasangkan (pair) printer di pengaturan Bluetooth HP terlebih dahulu.</Text>
        </View>
      )}
      <Label>Ukuran Kertas</Label>
      <Segmented testIDPrefix="printer-width" value={String(width) as "58" | "80"}
        options={[{ value: "58", label: "58 mm" }, { value: "80", label: "80 mm" }]}
        onChange={(v) => { const w = Number(v) as PaperWidth; setWidth(w); savePaperWidth(w); }} />
      <View style={s.current}>
        <Icon name="print-outline" size={20} color={colors.brandPrimary} />
        <Text testID="printer-current" style={s.currentText} numberOfLines={1}>{current.name ? `${current.name} (${current.address})` : "Belum ada printer dipilih"}</Text>
      </View>
      {devices && (
        <View style={s.list} testID="printer-device-list">
          {devices.length === 0 && <Text style={s.empty}>Tidak ada perangkat terpasang. Pair printer di pengaturan Bluetooth HP.</Text>}
          {devices.map((d) => (
            <Pressable key={d.address} testID={`printer-device-${d.address}`} onPress={() => pick(d)} style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}>
              <Icon name="bluetooth" size={18} color={colors.brandPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{d.name}</Text>
                <Text style={s.itemAddr}>{d.address}</Text>
              </View>
              {d.address === current.address && <Icon name="checkmark-circle" size={20} color={colors.success} />}
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ gap: sp.sm, marginTop: sp.md }}>
        <Button testID="printer-select-button" icon="bluetooth-outline" title={current.address ? "Ganti Printer" : "Pilih Printer Bluetooth"} loading={busy === "list"}
          onPress={() => run("list", async () => setDevices(await listPairedPrinters()))} />
        <Button testID="printer-test-button" variant="secondary" icon="print-outline" title="Tes Cetak" loading={busy === "test"}
          onPress={() => run("test", async () => { await printTest(); toast("Tes cetak dikirim ke printer"); })} />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  note: { flexDirection: "row", gap: sp.sm, backgroundColor: c.infoSoft, borderRadius: 12, padding: sp.md, marginBottom: sp.lg },
  noteText: { flex: 1, fontSize: fs.sm, color: c.onSurfaceTertiary, lineHeight: 18 },
  current: { flexDirection: "row", alignItems: "center", gap: sp.sm, marginTop: sp.lg },
  currentText: { flex: 1, fontSize: fs.base, fontWeight: "600", color: c.onSurface },
  list: { marginTop: sp.md, borderWidth: 1, borderColor: c.border, borderRadius: rad.md, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", gap: sp.md, padding: sp.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  itemName: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  itemAddr: { fontSize: fs.sm, color: c.muted },
  empty: { padding: sp.md, fontSize: fs.sm, color: c.muted },
}));
