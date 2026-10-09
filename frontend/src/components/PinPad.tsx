import React, { ReactNode, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { makeStyles, useTheme } from "../theme";
import { fs, haptic, Icon, sp } from "../ui";

// Keypad PIN kustom (tanpa keyboard sistem). `length` = panjang tetap (mode buka kunci),
// tanpa `length` = mode buat PIN 4–6 digit dengan tombol "Lanjut".
export function PinPad({ title, subtitle, length, onComplete, error, footer, onBio, testIDPrefix = "pin" }: {
  title: string; subtitle?: string; length?: number; onComplete: (pin: string) => void; error?: string | null;
  footer?: ReactNode; onBio?: () => void; testIDPrefix?: string;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const [value, setValue] = useState("");
  const max = length ?? 6;

  useEffect(() => { if (error) setValue(""); }, [error]);

  const press = (d: string) => {
    if (value.length >= max) return;
    haptic("select");
    const v = value + d;
    setValue(v);
    if (length && v.length === length) setTimeout(() => { onComplete(v); setValue(""); }, 120);
  };
  const del = () => { haptic("select"); setValue((v) => v.slice(0, -1)); };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"];
  return (
    <View style={s.wrap}>
      <View style={s.lockIcon}><Icon name="lock-closed" size={28} color={colors.brandPrimary} /></View>
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
      <View style={s.dots} testID={`${testIDPrefix}-dots`}>
        {Array.from({ length: max }).map((_, i) => (
          <View key={i} style={[s.dot, i < value.length && s.dotOn, !length && i >= 4 && i >= value.length && s.dotOptional]} />
        ))}
      </View>
      <Text testID={`${testIDPrefix}-error`} style={s.error}>{error ?? " "}</Text>
      <View style={s.grid}>
        {keys.map((k) => {
          if (k === "bio") {
            return onBio ? (
              <Pressable key={k} testID={`${testIDPrefix}-biometric`} style={s.key} onPress={onBio}>
                <Icon name="finger-print" size={30} color={colors.brandPrimary} />
              </Pressable>
            ) : <View key={k} style={s.keyBlank} />;
          }
          if (k === "del") {
            return (
              <Pressable key={k} testID={`${testIDPrefix}-delete`} style={s.key} onPress={del} onLongPress={() => setValue("")}>
                <Icon name="backspace-outline" size={26} color={colors.onSurface} />
              </Pressable>
            );
          }
          return (
            <Pressable key={k} testID={`${testIDPrefix}-key-${k}`} onPress={() => press(k)}
              style={({ pressed }) => [s.key, s.keyNum, pressed && { backgroundColor: colors.brandTertiary }]}>
              <Text style={s.keyText}>{k}</Text>
            </Pressable>
          );
        })}
      </View>
      {!length && (
        <Pressable testID={`${testIDPrefix}-submit`} disabled={value.length < 4}
          onPress={() => { const v = value; setValue(""); onComplete(v); }}
          style={[s.submit, value.length < 4 && { opacity: 0.4 }]}>
          <Text style={s.submitText}>Lanjut</Text>
        </Pressable>
      )}
      {footer}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { alignItems: "center", width: "100%", maxWidth: 360, alignSelf: "center" },
  lockIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: sp.lg },
  title: { fontSize: fs.xl, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  sub: { fontSize: fs.base, color: c.muted, marginTop: sp.xs, textAlign: "center" },
  dots: { flexDirection: "row", gap: sp.md, marginTop: sp.xl },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: c.brandPrimary },
  dotOn: { backgroundColor: c.brandPrimary },
  dotOptional: { borderColor: c.borderStrong, borderStyle: "dashed" },
  error: { color: c.error, fontSize: fs.base, fontWeight: "600", marginTop: sp.md, minHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 288, justifyContent: "space-between", rowGap: sp.md, marginTop: sp.md },
  key: { width: 80, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 36 },
  keyNum: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  keyBlank: { width: 80, height: 72 },
  keyText: { fontSize: 28, fontWeight: "600", color: c.onSurface },
  submit: { marginTop: sp.xl, height: 52, width: 288, borderRadius: 14, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  submitText: { color: c.onBrandPrimary, fontSize: fs.lg, fontWeight: "700" },
}));
