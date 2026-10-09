import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinPad } from "./components/PinPad";
import { useTheme } from "./theme";
import { sp } from "./ui";
import { storage } from "./utils/storage";

const PIN_KEY = "kos_pin_hash";
const PIN_LEN = "kos_pin_len";
const BIO_KEY = "kos_bio_enabled";
const RELOCK_MS = 30000;

export function hashPin(pin: string) {
  const s = "kosmanager::" + pin;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

type LockCtx = {
  hasPin: boolean; bioEnabled: boolean; bioAvailable: boolean;
  setPin: (pin: string) => Promise<void>; removePin: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>; setBio: (v: boolean) => Promise<void>; lockNow: () => void;
};
const Ctx = createContext<LockCtx>(null as unknown as LockCtx);
export const useLock = () => useContext(Ctx);

async function bioSupported() {
  if (Platform.OS === "web") return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export function LockProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [pinLen, setPinLen] = useState(4);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bgAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const h = await storage.secureGet(PIN_KEY, null as string | null);
      const len = await storage.getItem(PIN_LEN, 4);
      const bio = await storage.getItem(BIO_KEY, false);
      setPinHash(h);
      setPinLen(Number(len) || 4);
      setBioEnabled(!!bio);
      setBioAvailable(await bioSupported());
      setLocked(!!h);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "background") bgAt.current = Date.now();
      if (st === "active" && bgAt.current && pinHash && Date.now() - bgAt.current > RELOCK_MS) setLocked(true);
      if (st === "active") bgAt.current = null;
    });
    return () => sub.remove();
  }, [pinHash]);

  const tryBio = useCallback(async () => {
    if (!bioEnabled || !bioAvailable) return;
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Buka DSKos", cancelLabel: "Gunakan PIN" });
    if (r.success) { setError(null); setLocked(false); }
  }, [bioEnabled, bioAvailable]);

  useEffect(() => { if (locked && ready) tryBio(); }, [locked, ready, tryBio]);

  const value: LockCtx = {
    hasPin: !!pinHash, bioEnabled, bioAvailable,
    setPin: async (pin) => {
      const h = hashPin(pin);
      await storage.secureSet(PIN_KEY, h);
      await storage.setItem(PIN_LEN, pin.length);
      setPinHash(h);
      setPinLen(pin.length);
    },
    removePin: async () => {
      await storage.secureRemove(PIN_KEY);
      await storage.setItem(BIO_KEY, false);
      setPinHash(null);
      setBioEnabled(false);
    },
    verifyPin: async (pin) => hashPin(pin) === pinHash,
    setBio: async (v) => { await storage.setItem(BIO_KEY, v); setBioEnabled(v); },
    lockNow: () => { if (pinHash) setLocked(true); },
  };

  return (
    <Ctx.Provider value={value}>
      {ready && children}
      {(!ready || locked) && (
        <View testID="lock-screen" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, justifyContent: "center", paddingTop: insets.top, paddingBottom: insets.bottom + sp.lg, paddingHorizontal: sp.lg }]}>
          {ready && (
            <PinPad
              testIDPrefix="lock-pin"
              title="Masukkan PIN"
              subtitle="Data kos Anda terlindungi"
              length={pinLen}
              error={error}
              onBio={bioEnabled && bioAvailable ? tryBio : undefined}
              onComplete={(pin) => {
                if (hashPin(pin) === pinHash) { setError(null); setLocked(false); } else setError("PIN salah, coba lagi");
              }}
            />
          )}
        </View>
      )}
    </Ctx.Provider>
  );
}
