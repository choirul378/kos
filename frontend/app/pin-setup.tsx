import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinPad } from "@/src/components/PinPad";
import { useFeedback } from "@/src/feedback";
import { useLock } from "@/src/lock";
import { makeStyles } from "@/src/theme";
import { Header, sp } from "@/src/ui";

type Step = "old" | "new" | "confirm";

export default function PinSetup() {
  const { hasPin, verifyPin, setPin } = useLock();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStyles();
  const { toast } = useFeedback();
  const [step, setStep] = useState<Step>(hasPin ? "old" : "new");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string | null>(null);

  const titles: Record<Step, [string, string]> = {
    old: ["Masukkan PIN lama", "Verifikasi sebelum mengubah PIN"],
    new: ["Buat PIN baru", "Pilih 4–6 angka yang mudah Anda ingat"],
    confirm: ["Ulangi PIN", "Masukkan PIN yang sama sekali lagi"],
  };

  const onComplete = async (pin: string) => {
    if (step === "old") {
      if (await verifyPin(pin)) { setError(null); setStep("new"); } else setError("PIN lama salah");
    } else if (step === "new") {
      setFirst(pin); setError(null); setStep("confirm");
    } else if (pin === first) {
      await setPin(pin);
      toast("PIN berhasil disimpan");
      router.back();
    } else {
      setError("PIN tidak sama, ulangi dari awal");
      setStep("new");
    }
  };

  return (
    <View style={s.root} testID="pin-setup-screen">
      <Header back title={hasPin ? "Ubah PIN" : "Atur PIN"} />
      <View style={[s.body, { paddingBottom: insets.bottom + sp.lg }]}>
        <PinPad key={step} testIDPrefix="setup-pin" title={titles[step][0]} subtitle={titles[step][1]} error={error}
          length={step === "confirm" ? first.length : undefined} onComplete={onComplete} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: sp.lg },
}));
