import { View, Text, StyleSheet, SafeAreaView, TextInput, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SOTERIA } from "./theme";
import { router } from "expo-router";

export default function LoginScreen() {
  const [showPw, setShowPw] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#2d134d", SOTERIA.colors.bgDark, "#000000"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Ionicons name="chevron-back" size={22} color="white" />
          <Text style={styles.title}>Sign In</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={42} color={SOTERIA.colors.primary} />
            </View>
            <Text style={styles.appName}>Soteria</Text>
            <Text style={styles.tagline}>Your personal safety companion</Text>
          </View>

          {/* Glass card */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              placeholder="name@example.com"
              placeholderTextColor={SOTERIA.colors.border}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <View>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={SOTERIA.colors.border}
                secureTextEntry={!showPw}
                style={[styles.input, { paddingRight: 44 }]}
              />
              <Pressable
                style={styles.eye}
                onPress={() => setShowPw(!showPw)}
              >
                <Ionicons
                  name={showPw ? "eye-off" : "eye"}
                  size={20}
                  color={SOTERIA.colors.muted}
                />
              </Pressable>
            </View>

            <Pressable style={styles.signIn} onPress={() => router.push("/(tabs)/dashboard")}>
  <Text style={styles.signInText}>Sign In</Text>
</Pressable>

          </BlurView>

          <Text style={styles.footer}>
            Don’t have an account?
            <Text style={{ color: SOTERIA.colors.primary, fontWeight: "800" }}>
              {" "}Sign Up
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  brand: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "rgba(127,19,236,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  appName: {
    color: "white",
    fontSize: 32,
    fontWeight: "700",
  },
  tagline: {
    color: SOTERIA.colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(127,19,236,0.1)",
  },
  label: {
    color: SOTERIA.colors.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SOTERIA.colors.border,
    backgroundColor: SOTERIA.colors.inputBg,
    paddingHorizontal: 16,
    color: "white",
  },
  eye: {
    position: "absolute",
    right: 14,
    top: 16,
  },
  signIn: {
    marginTop: 24,
    backgroundColor: SOTERIA.colors.primary,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
    color: SOTERIA.colors.muted,
  },
});