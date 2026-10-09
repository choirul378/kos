import React, { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme } from "./theme";
import { Button, fs, haptic, Icon, rad, sp } from "./ui";

type ToastType = "success" | "error" | "info";
type ConfirmOpts = { title: string; message?: string; confirmText?: string; cancelText?: string; destructive?: boolean };
type Ctx = { toast: (msg: string, type?: ToastType) => void; confirm: (o: ConfirmOpts) => Promise<boolean> };

const FeedbackCtx = createContext<Ctx>({ toast: () => {}, confirm: async () => false });
export const useFeedback = () => useContext(FeedbackCtx);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const [toastState, setToast] = useState<{ msg: string; type: ToastType; key: number } | null>(null);
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, type: ToastType = "success") => {
    haptic(type === "error" ? "error" : "success");
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);

  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };
  const tColor = toastState?.type === "error" ? colors.error : toastState?.type === "info" ? colors.surfaceInverse : colors.brandPrimary;

  return (
    <FeedbackCtx.Provider value={{ toast, confirm }}>
      {children}
      <Modal visible={!!dlg} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <Pressable style={s.overlay} onPress={() => close(false)}>
          <Pressable testID="confirm-dialog" style={[s.sheet, { paddingBottom: insets.bottom + sp.lg }]} onPress={() => {}}>
            <View style={s.grabber} />
            <Text testID="confirm-dialog-title" style={s.title}>{dlg?.title}</Text>
            {!!dlg?.message && <Text style={s.msg}>{dlg.message}</Text>}
            <View style={s.row}>
              <Button testID="confirm-dialog-cancel" variant="ghost" title={dlg?.cancelText ?? "Batal"} onPress={() => close(false)} style={{ flex: 1 }} />
              <Button testID="confirm-dialog-ok" variant={dlg?.destructive ? "danger" : "primary"} title={dlg?.confirmText ?? "Ya, lanjutkan"} onPress={() => close(true)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {toastState && (
        <Animated.View key={toastState.key} entering={FadeInUp} exiting={FadeOutUp} pointerEvents="none"
          style={[s.toast, { top: insets.top + sp.sm, backgroundColor: tColor }]} testID="toast-message">
          <Icon name={toastState.type === "error" ? "alert-circle" : "checkmark-circle"} size={20} color={colors.onBrand} />
          <Text style={s.toastText}>{toastState.msg}</Text>
        </Animated.View>
      )}
    </FeedbackCtx.Provider>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: rad.lg, borderTopRightRadius: rad.lg, padding: sp.xl, paddingTop: sp.md },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, alignSelf: "center", marginBottom: sp.lg },
  title: { fontSize: fs.xl, fontWeight: "800", color: c.onSurface },
  msg: { fontSize: fs.base, color: c.onSurfaceTertiary, marginTop: sp.sm, lineHeight: 21 },
  row: { flexDirection: "row", gap: sp.md, marginTop: sp.xl },
  toast: { position: "absolute", left: sp.lg, right: sp.lg, zIndex: 999, elevation: 10, borderRadius: rad.md, paddingVertical: sp.md, paddingHorizontal: sp.lg, flexDirection: "row", alignItems: "center", gap: sp.sm },
  toastText: { color: c.onBrand, fontSize: fs.base, fontWeight: "600", flex: 1 },
}));
