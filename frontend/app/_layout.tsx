import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { LogBox } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { IntroSplash } from "@/src/components/IntroSplash";
import { FeedbackProvider } from "@/src/feedback";
import { LockProvider } from "@/src/lock";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true)

export default function RootLayout() {
  const { colors } = useTheme();
  const [intro, setIntro] = useState(true);
  // Prewarm icon font so icons render immediately (incl. Expo Go Android).
  useFonts({ Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf") });
  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <FeedbackProvider>
            <LockProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
            </LockProvider>
            {intro && <IntroSplash onDone={() => setIntro(false)} />}
          </FeedbackProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
