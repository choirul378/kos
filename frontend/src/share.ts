import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Linking, Platform } from "react-native";

import { waLink } from "./format";

export async function openWhatsApp(phone: string, text: string) {
  const url = waLink(phone, text);
  if (Platform.OS === "web") {
    window.open(url, "_blank");
    return;
  }
  await Linking.openURL(url);
}

// Simpan kuitansi sebagai PDF lokal lalu buka menu bagikan (simpan ke Files/Drive/WA).
export async function sharePdf(html: string, fileName: string) {
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const target = `${FileSystem.documentDirectory}${fileName}.pdf`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.moveAsync({ from: uri, to: target });
  await Sharing.shareAsync(target, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Bagikan Kuitansi" });
}

function backupName() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `kosmanager-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

// Export: tulis file JSON ke penyimpanan internal lalu bagikan.
export async function shareBackup(json: string) {
  const name = backupName();
  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    return name;
  }
  const uri = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, json);
  await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Simpan Backup KosManager" });
  return name;
}

// Android: simpan langsung ke folder pilihan (mis. Download) via Storage Access Framework.
export async function saveBackupToFolder(json: string): Promise<string | null> {
  const SAF = FileSystem.StorageAccessFramework;
  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted) return null;
  const name = backupName();
  const uri = await SAF.createFileAsync(perm.directoryUri, name.replace(".json", ""), "application/json");
  await FileSystem.writeAsStringAsync(uri, json);
  return name;
}

export async function pickBackupFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (Platform.OS === "web") {
    if (asset.file) return await asset.file.text();
    return await (await fetch(asset.uri)).text();
  }
  return FileSystem.readAsStringAsync(asset.uri);
}

// Salin foto KTP ke folder internal aplikasi agar tetap ada walau foto di galeri dihapus.
export async function persistKtpPhoto(uri: string, base64?: string | null) {
  if (Platform.OS === "web") return base64 ? `data:image/jpeg;base64,${base64}` : uri;
  const dir = `${FileSystem.documentDirectory}ktp/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const target = `${dir}ktp_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}
