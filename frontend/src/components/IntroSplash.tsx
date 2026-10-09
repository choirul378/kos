import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const logo = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(out, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [logo, tag, out, onDone]);

  return (
    <Animated.View testID="intro-splash" pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: out, zIndex: 100 }]}>
      <LinearGradient colors={["#085880", "#0A8C98", "#04BEB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.root}>
        <Animated.Image source={require("@/assets/images/logo-white.png")} resizeMode="contain"
          style={[s.logo, { opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]} />
        <Animated.View style={{ opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Text style={s.tag}>Kelola kos jadi mudah</Text>
        </Animated.View>
        <Animated.Text style={[s.credit, { opacity: tag }]}>dskode.com</Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 190, height: 233 },
  tag: { color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "600", marginTop: 28, letterSpacing: 0.5 },
  credit: { position: "absolute", bottom: 48, color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: 1 },
});
