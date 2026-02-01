import { View, Text, StyleSheet, SafeAreaView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { SOTERIA } from "./theme";
import { router } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";

export default function LoginScreen() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth() as any;

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/dashboard");
    }
  }, [user]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await signIn(email, password);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await signUp(email, password);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

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

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.brand}>
              <Text style={styles.appName}>Soteria</Text>
              <Text style={styles.tagline}>Your personal safety companion</Text>
            </View>

            {/* Glass card */}
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor={SOTERIA.colors.border}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
              <View>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={SOTERIA.colors.border}
                  secureTextEntry={!showPw}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
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

              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : null}

              <Pressable
                style={[styles.signIn, loading && styles.signInDisabled]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.signInText}>Sign In</Text>
                )}
              </Pressable>

            </BlurView>

            <Pressable onPress={handleSignUp} disabled={loading}>
              <Text style={styles.footer}>
                Don't have an account?
                <Text style={{ color: SOTERIA.colors.primary, fontWeight: "800" }}>
                  {" "}Sign Up
                </Text>
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  appName: {
    color: "white",
    fontSize: 56,
    fontFamily: "Allura",
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
  signInDisabled: {
    opacity: 0.5,
  },
  error: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
    color: SOTERIA.colors.muted,
  },
});