import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CashType, deleteCash, getCash, saveCash } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { amountInput, isValidDate, parseAmount, todayISO } from "@/src/format";
import { makeStyles } from "@/src/theme";
import { Button, Chips, Field, Header, Label, Loading, Segmented, sp } from "@/src/ui";

const CATS: Record<CashType, string[]> = {
  keluar: ["Listrik", "Air", "Internet", "Perbaikan", "Kebersihan", "Gaji Penjaga", "Keamanan", "Pajak", "Lainnya"],
  masuk: ["Deposit", "Denda", "Laundry", "Parkir", "Lainnya"],
};

export default function CashForm() {
  const params = useLocalSearchParams<{ id?: string; type?: CashType }>();
  const editId = params.id ? Number(params.id) : undefined;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStyles();
  const { toast, confirm } = useFeedback();
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<CashType>(params.type === "masuk" ? "masuk" : "keluar");
  const [category, setCategory] = useState(CATS[type][0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editId) return;
    getCash(editId).then((c) => {
      if (c) { setType(c.type); setCategory(c.category); setAmount(amountInput(String(c.amount))); setDate(c.date); setDesc(c.description); }
      setLoading(false);
    });
  }, [editId]);

  const changeType = (t: CashType) => { setType(t); setCategory(CATS[t][0]); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!parseAmount(amount)) e.amount = "Nominal wajib diisi";
    if (!isValidDate(date)) e.date = "Format tanggal: TTTT-BB-HH";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await saveCash({ type, category, amount: parseAmount(amount), date, description: desc }, editId);
      toast(type === "keluar" ? "Pengeluaran tersimpan" : "Pemasukan tersimpan");
      router.back();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editId || !(await confirm({ title: "Hapus catatan ini?", confirmText: "Hapus", destructive: true }))) return;
    await deleteCash(editId);
    toast("Catatan dihapus");
    router.back();
  };

  const cats = CATS[type].includes(category) ? CATS[type] : [...CATS[type], category];

  return (
    <View style={s.root} testID="cash-form-screen">
      <Header back title={editId ? "Edit Catatan Kas" : type === "keluar" ? "Catat Pengeluaran" : "Catat Pemasukan"} />
      {loading ? <Loading /> : (
        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
          <Segmented<CashType> testIDPrefix="cash-type" value={type} onChange={changeType}
            options={[{ value: "keluar", label: "Pengeluaran" }, { value: "masuk", label: "Pemasukan Lain" }]} />
          <View style={{ height: sp.lg }} />
          <Label>Kategori</Label>
          <View style={s.chipWrap}>
            <Chips testIDPrefix="cash-category" edge={0} value={category} onChange={setCategory} options={cats.map((c) => ({ value: c, label: c }))} />
          </View>
          <Field testID="cash-amount-input" label="Nominal (Rp) *" value={amount} onChangeText={(v) => setAmount(amountInput(v))} keyboardType="number-pad" placeholder="0" error={errors.amount} />
          <Field testID="cash-date-input" label="Tanggal" value={date} onChangeText={setDate} error={errors.date} hint="Format TTTT-BB-HH" />
          <Field testID="cash-desc-input" label="Keterangan" value={desc} onChangeText={setDesc} placeholder="Contoh: Token listrik bulan Juni" multiline />
          <Button testID="cash-save-button" title="Simpan" icon="checkmark" loading={saving} onPress={submit} />
          {!!editId && <Button testID="cash-delete-button" title="Hapus" icon="trash-outline" variant="danger" onPress={remove} style={{ marginTop: sp.md }} />}
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  chipWrap: { marginTop: -sp.sm, marginBottom: sp.sm },
}));
