import { Ionicons } from "@react-native-vector-icons/ionicons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { ReactNode } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { periodLabel, shiftPeriod, initials } from "./format";
import { makeStyles, useTheme } from "./theme";

export const Icon = Ionicons;
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const rad = { sm: 6, md: 12, lg: 20, pill: 999 };
export const fs = { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, hero: 30 };
const WA_GREEN = "#25D366"; // WhatsApp brand color

export function haptic(kind: "light" | "success" | "error" | "select" = "light") {
  if (Platform.OS === "web") return;
  const p =
    kind === "success" ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === "error" ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        : kind === "select" ? Haptics.selectionAsync()
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p?.catch?.(() => {});
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";

export function Button({ title, onPress, icon, variant = "primary", loading, disabled, testID, style, size = "md" }: {
  title: string; onPress: () => void; icon?: IconName; variant?: Variant; loading?: boolean; disabled?: boolean;
  testID?: string; style?: StyleProp<ViewStyle>; size?: "md" | "sm";
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const [bg, fg] = {
    primary: [colors.brandPrimary, colors.onBrandPrimary],
    secondary: [colors.brandTertiary, colors.onBrandTertiary],
    ghost: [colors.surfaceTertiary, colors.onSurfaceTertiary],
    danger: [colors.errorSoft, colors.error],
    whatsapp: [WA_GREEN, "#FFFFFF"],
  }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => { haptic(); onPress(); }}
      style={({ pressed }) => [s.btn, size === "sm" && s.btnSm, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Icon name={icon} size={size === "sm" ? 16 : 20} color={fg} />}
          <Text style={[s.btnText, size === "sm" && s.btnTextSm, { color: fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, testID, tone = "ghost", label }: {
  icon: IconName; onPress: () => void; testID?: string; tone?: "ghost" | "brand" | "onBrand"; label?: string;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const bg = tone === "brand" ? colors.brandTertiary : tone === "onBrand" ? "rgba(255,255,255,0.18)" : colors.surfaceTertiary;
  const fg = tone === "brand" ? colors.onBrandTertiary : tone === "onBrand" ? colors.onBrand : colors.onSurface;
  return (
    <Pressable testID={testID} accessibilityLabel={label} onPress={() => { haptic(); onPress(); }}
      style={({ pressed }) => [s.iconBtn, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={22} color={fg} />
    </Pressable>
  );
}

export function Field({ label, error, style, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[s.input, props.multiline && s.inputMulti, !!error && { borderColor: colors.error }, style]}
        {...props}
      />
      {!!hint && !error && <Text style={s.hint}>{hint}</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const s = useStyles();
  return <Text style={s.label}>{children}</Text>;
}

export function Card({ children, style, onPress, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string }) {
  const s = useStyles();
  if (!onPress) return <View testID={testID} style={[s.card, style]}>{children}</View>;
  return (
    <Pressable testID={testID} onPress={() => { haptic(); onPress(); }}
      style={({ pressed }) => [s.card, style, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      {children}
    </Pressable>
  );
}

export type Tone = "success" | "warning" | "error" | "info" | "neutral" | "brand";
export function Badge({ label, tone = "neutral", testID }: { label: string; tone?: Tone; testID?: string }) {
  const { colors } = useTheme();
  const s = useStyles();
  const [bg, fg] = {
    success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning],
    error: [colors.errorSoft, colors.error], info: [colors.infoSoft, colors.info],
    neutral: [colors.surfaceTertiary, colors.onSurfaceTertiary], brand: [colors.brandTertiary, colors.onBrandTertiary],
  }[tone];
  return <View testID={testID} style={[s.badge, { backgroundColor: bg }]}><Text style={[s.badgeText, { color: fg }]}>{label}</Text></View>;
}

export function Header({ title, subtitle, back, right, testID }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStyles();
  return (
    <View testID={testID} style={[s.header, { paddingTop: insets.top + sp.sm }]}>
      {back && (
        <IconButton testID="header-back-button" icon="chevron-back" label="Kembali"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[s.headerTitle, back && { fontSize: fs.xl }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ title, action, onAction, testID }: { title: string; action?: string; onAction?: () => void; testID?: string }) {
  const s = useStyles();
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && onAction && (
        <Pressable testID={testID} hitSlop={12} onPress={onAction}><Text style={s.sectionAction}>{action}</Text></Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, message, actionLabel, onAction, testID }: {
  icon: IconName; title: string; message: string; actionLabel?: string; onAction?: () => void; testID?: string;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View testID={testID} style={s.empty}>
      <View style={s.emptyIcon}><Icon name={icon} size={40} color={colors.brandPrimary} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyMsg}>{message}</Text>
      {actionLabel && onAction && <Button testID={testID ? `${testID}-action` : undefined} title={actionLabel} icon="add" onPress={onAction} style={{ marginTop: sp.lg, alignSelf: "center", paddingHorizontal: sp.xl }} />}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState testID="error-state" icon="alert-circle-outline" title="Terjadi kesalahan" message={message} actionLabel="Coba lagi" onAction={onRetry} />;
}

export function Loading() {
  const { colors } = useTheme();
  return <View testID="loading-indicator" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: sp.xxl }}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>;
}

export type Option<T extends string> = { value: T; label: string };

export function Chips<T extends string>({ options, value, onChange, testIDPrefix, edge = sp.lg }: {
  options: Option<T>[]; value: T | null; onChange: (v: T) => void; testIDPrefix: string; edge?: number;
}) {
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}
      contentContainerStyle={{ gap: sp.sm, paddingHorizontal: edge, alignItems: "center" }} keyboardShouldPersistTaps="handled">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} testID={`${testIDPrefix}-${o.value}`} onPress={() => { haptic("select"); onChange(o.value); }}
            style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Segmented<T extends string>({ options, value, onChange, testIDPrefix }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; testIDPrefix: string;
}) {
  const s = useStyles();
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} testID={`${testIDPrefix}-${o.value}`} onPress={() => { haptic("select"); onChange(o.value); }}
            style={[s.segItem, active && s.segItemActive]}>
            <Text style={[s.segText, active && s.segTextActive]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MonthPicker({ value, onChange, testID = "month-picker" }: { value: string; onChange: (v: string) => void; testID?: string }) {
  const s = useStyles();
  return (
    <View testID={testID} style={s.month}>
      <IconButton testID={`${testID}-prev`} icon="chevron-back" onPress={() => onChange(shiftPeriod(value, -1))} />
      <Text testID={`${testID}-label`} style={s.monthText}>{periodLabel(value)}</Text>
      <IconButton testID={`${testID}-next`} icon="chevron-forward" onPress={() => onChange(shiftPeriod(value, 1))} />
    </View>
  );
}

export function Fab({ onPress, bottom, testID, icon = "add", label }: { onPress: () => void; bottom: number; testID: string; icon?: IconName; label: string }) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Pressable testID={testID} accessibilityLabel={label} onPress={() => { haptic(); onPress(); }}
      style={({ pressed }) => [s.fab, { bottom, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <Icon name={icon} size={22} color={colors.onBrandPrimary} />
      <Text style={s.fabText}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const s = useStyles();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

export function InfoRow({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const s = useStyles();
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text testID={testID} style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  btn: { minHeight: 48, borderRadius: rad.md, paddingHorizontal: sp.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp.sm },
  btnSm: { minHeight: 40, paddingHorizontal: sp.md, borderRadius: rad.pill },
  btnText: { fontSize: fs.lg, fontWeight: "700" },
  btnTextSm: { fontSize: fs.base },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  field: { marginBottom: sp.lg },
  label: { fontSize: fs.base, fontWeight: "600", color: c.onSurfaceTertiary, marginBottom: sp.sm },
  input: { minHeight: 50, backgroundColor: c.surfaceTertiary, borderRadius: rad.md, paddingHorizontal: sp.lg, fontSize: fs.lg, color: c.onSurface, borderWidth: 1, borderColor: "transparent" },
  inputMulti: { minHeight: 88, paddingTop: sp.md, textAlignVertical: "top" },
  hint: { fontSize: fs.sm, color: c.muted, marginTop: sp.xs },
  error: { fontSize: fs.sm, color: c.error, marginTop: sp.xs },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: rad.lg, padding: sp.lg, borderWidth: 1, borderColor: c.border, shadowColor: c.onSurface, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  badge: { paddingHorizontal: sp.sm + 2, paddingVertical: 3, borderRadius: rad.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: fs.sm, fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center", gap: sp.md, paddingHorizontal: sp.lg, paddingBottom: sp.md, backgroundColor: c.surface },
  headerTitle: { fontSize: fs.xxl, fontWeight: "800", color: c.onSurface, letterSpacing: -0.3 },
  headerSub: { fontSize: fs.base, color: c.muted, marginTop: 2 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: sp.xl, marginBottom: sp.md },
  sectionTitle: { fontSize: fs.lg, fontWeight: "700", color: c.onSurface },
  sectionAction: { fontSize: fs.base, fontWeight: "700", color: c.brandPrimary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: sp.xxl, minHeight: 360 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: sp.lg },
  emptyTitle: { fontSize: fs.xl, fontWeight: "700", color: c.onSurface, textAlign: "center" },
  emptyMsg: { fontSize: fs.base, color: c.muted, textAlign: "center", marginTop: sp.sm, lineHeight: 20 },
  chipRow: { height: 56, flexGrow: 0 },
  chip: { height: 36, paddingHorizontal: sp.lg, borderRadius: rad.pill, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: fs.base, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTextActive: { color: c.onBrandPrimary },
  seg: { flexDirection: "row", backgroundColor: c.surfaceTertiary, borderRadius: rad.md, padding: sp.xs },
  segItem: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: rad.md - 2 },
  segItemActive: { backgroundColor: c.surfaceSecondary, shadowColor: c.onSurface, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segText: { fontSize: fs.base, fontWeight: "600", color: c.muted },
  segTextActive: { color: c.brandPrimary },
  month: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: rad.md, padding: sp.xs, borderWidth: 1, borderColor: c.border },
  monthText: { fontSize: fs.lg, fontWeight: "700", color: c.onSurface },
  fab: { position: "absolute", right: sp.lg, height: 56, paddingHorizontal: sp.xl - 4, borderRadius: 28, backgroundColor: c.brandPrimary, flexDirection: "row", alignItems: "center", gap: sp.sm, shadowColor: c.brandPrimary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: fs.lg },
  avatar: { backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.onBrandTertiary, fontWeight: "800" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: sp.md, borderBottomWidth: 1, borderBottomColor: c.divider, gap: sp.lg },
  infoLabel: { fontSize: fs.base, color: c.muted },
  infoValue: { fontSize: fs.base, fontWeight: "600", color: c.onSurface, flexShrink: 1, textAlign: "right" },
}));
