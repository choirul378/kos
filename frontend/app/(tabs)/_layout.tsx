import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";
import { Icon, IconName } from "@/src/ui";

const TABS: { name: string; title: string; sf: string; icon: IconName; iconActive: IconName }[] = [
  { name: "index", title: "Beranda", sf: "house.fill", icon: "home-outline", iconActive: "home" },
  { name: "rooms", title: "Kamar", sf: "bed.double.fill", icon: "bed-outline", iconActive: "bed" },
  { name: "tenants", title: "Penghuni", sf: "person.2.fill", icon: "people-outline", iconActive: "people" },
  { name: "finance", title: "Keuangan", sf: "banknote.fill", icon: "wallet-outline", iconActive: "wallet" },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf as any} />
            <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border, ...(Platform.OS === "web" ? { height: 64 } : {}) },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, focused }) => <Icon name={focused ? t.iconActive : t.icon} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
