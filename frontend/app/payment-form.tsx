import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getPaidForPeriod, getPayment, listTenants, PayStatus, savePayment, Tenant } from "@/src/db/repo";
import { useFeedback } from "@/src/feedback";
import { amountInput, currentPeriod, isValidDate, parseAmount, rupiah, todayISO } from "@/src/format";
import { makeStyles } from "@/src/theme";
import { Button, Card, Chips, EmptyState, Field, fs, Header, Label, Loading, MonthPicker, sp } from "@/src/ui";

const METHODS = ["Tunai", "Transfer", "QRIS", "E-Wallet"];

export default function PaymentForm() {
  const { tenantId, id, period: periodParam } = useLocalSearchParams<{ tenantId?: string; id?: string; period?: string }>();
  const editId = id ? Number(id) : undefined;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStyles();
  const { toast } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenant, setTenant] = useState<string | null>(tenantId ?? null);
  const [period, setPeriod] = useState(periodParam && /^\d{4}-\d{2}$/.test(periodParam) ? periodParam : currentPeriod());
  const [payDate, setPayDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PayStatus>("lunas");
  const [method, setMethod] = useState("Tunai");
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(0);
  const [dateErr, setDateErr] = useState("");

  const selected = tenants.find((t) => String(t.id) === tenant);
  const price = selected?.room_price ?? 0;

  useEffect(() => {
    (async () => {
      const list = await listTenants("aktif");
      if (editId) {
        const p = await getPayment(editId);
        if (p) {
          setTenant(String(p.tenant_id)); setPeriod(p.period); setPayDate(p.pay_date);
          setAmount(amountInput(String(p.amount))); setStatus(p.status); setMethod(p.method); setNotes(p.notes);
          if (!list.find((t) => t.id === p.tenant_id)) {
            const all = await listTenants();
            const t = all.find((x) => x.id === p.tenant_id);
            if (t) list.push(t);
          }
        }
      } else if (!tenantId && list.length === 1) setTenant(String(list[0].id));
      setTenants(list);
      setLoading(false);
    })();
  }, [editId, tenantId]);

  const refreshPaid = useCallback(async (fillAmount: boolean) => {
    if (!selected) return;
    const p = await getPaidForPeriod(selected.id, period, editId ?? 0);
    setPaid(p);
    if (fillAmount) {
      const rem = Math.max((selected.room_price ?? 0) - p, 0);
      setAmount(rem ? amountInput(String(rem)) : "");
      setStatus("lunas");
    }
  }, [selected, period, editId]);

  useEffect(() => { refreshPaid(!editId); }, [refreshPaid, editId]);

  const onAmount = (v: string) => {
    const f = amountInput(v);
    setAmount(f);
    if (price) setStatus(paid + parseAmount(f) >= price ? "lunas" : "dp");
  };

  const submit = async () => {
    if (!isValidDate(payDate)) return setDateErr("Format tanggal: TTTT-BB-HH");
    setDateErr("");
    setSaving(true);
    try {
      const pid = await savePayment({ tenant_id: Number(tenant), pay_date: payDate, period, amount: parseAmount(amount), status, method, notes }, editId);
      toast("Pembayaran tersimpan");
      router.replace(`/receipt/${pid}`);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={s.root}><Header back title="Catat Pembayaran" /><Loading /></View>;

  return (
    <View style={s.root} testID="payment-form-screen">
      <Header back title={editId ? "Edit Pembayaran" : "Catat Pembayaran"} />
      {tenants.length === 0 ? (
        <EmptyState testID="payment-no-tenant" icon="people-outline" title="Belum ada penghuni aktif"
          message="Tambahkan penghuni dan pilih kamarnya sebelum mencatat pembayaran."
          actionLabel="Tambah Penghuni" onAction={() => router.replace("/tenant-form")} />
      ) : (
        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: sp.lg, paddingBottom: insets.bottom + sp.xl }}>
          <Label>Penghuni *</Label>
          <View style={s.chipWrap}>
            <Chips testIDPrefix="payment-tenant" edge={0} value={tenant} onChange={setTenant}
              options={tenants.map((t) => ({ value: String(t.id), label: `${t.name}${t.room_number ? " · Kmr " + t.room_number : ""}` }))} />
          </View>
          <Label>Periode Bulan</Label>
          <MonthPicker testID="payment-period" value={period} onChange={setPeriod} />
          {selected && (
            <Card style={s.info} testID="payment-bill-info">
              <View style={s.infoRow}><Text style={s.infoLabel}>Harga sewa</Text><Text style={s.infoVal}>{rupiah(price)}</Text></View>
              <View style={s.infoRow}><Text style={s.infoLabel}>Sudah dibayar periode ini</Text><Text style={s.infoVal}>{rupiah(paid)}</Text></View>
              <View style={s.infoRow}><Text style={[s.infoLabel, { fontWeight: "700" }]}>Sisa tagihan</Text><Text testID="payment-remaining" style={[s.infoVal, s.remain]}>{rupiah(Math.max(price - paid, 0))}</Text></View>
            </Card>
          )}
          <Field testID="payment-amount-input" label="Nominal Dibayar (Rp) *" value={amount} onChangeText={onAmount} keyboardType="number-pad" placeholder="0" />
          <Label>Status</Label>
          <View style={s.chipWrap}>
            <Chips<PayStatus> testIDPrefix="payment-status" edge={0} value={status} onChange={setStatus}
              options={[{ value: "lunas", label: "Lunas" }, { value: "dp", label: "DP / Cicilan" }]} />
          </View>
          <Field testID="payment-date-input" label="Tanggal Bayar" value={payDate} onChangeText={setPayDate} error={dateErr} hint="Format TTTT-BB-HH" />
          <Label>Metode</Label>
          <View style={s.chipWrap}>
            <Chips testIDPrefix="payment-method" edge={0} value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: m }))} />
          </View>
          <Field testID="payment-notes-input" label="Catatan" value={notes} onChangeText={setNotes} placeholder="Opsional" multiline />
          <Button testID="payment-save-button" title="Simpan & Buat Kuitansi" icon="receipt-outline" loading={saving} disabled={!tenant} onPress={submit} />
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  chipWrap: { marginTop: -sp.sm, marginBottom: sp.sm },
  info: { marginTop: sp.md, marginBottom: sp.lg, backgroundColor: c.brandTertiary, borderColor: c.brandTertiary, gap: sp.xs },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: fs.base, color: c.onSurfaceTertiary },
  infoVal: { fontSize: fs.base, fontWeight: "700", color: c.onSurface },
  remain: { color: c.brandPrimary, fontSize: fs.lg },
}));
