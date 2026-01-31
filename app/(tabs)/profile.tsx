import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SOTERIA } from "../theme";

export default function ProfileScreen() {
  const [name, setName] = useState("Sarah Jenkins");
  const [handle, setHandle] = useState("@sarahj");
  const [shareDefault, setShareDefault] = useState(true);
  const [quietMode, setQuietMode] = useState(false);

  const [emgName, setEmgName] = useState("Mom");
  const [emgPhone, setEmgPhone] = useState("+1 (555) 123-4567");

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0a0a", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.profileRow}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: "https://i.pravatar.cc/120?img=32" }}
              style={styles.avatar}
            />
          </View>
          <View>
            <Text style={styles.smallMuted}>Profile</Text>
            <Text style={styles.nameText}>{name}</Text>
          </View>
        </View>

        <View style={styles.rightTop}>
          <Text style={styles.logoText}>Soteria</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={20} color="white" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Card */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="person" size={18} color={SOTERIA.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Account</Text>
            </View>

            <Field label="Display Name" value={name} onChangeText={setName} />
            <Field label="Username" value={handle} onChangeText={setHandle} />

            <View style={styles.divider} />

            <Pressable style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <Ionicons name="mail-outline" size={18} color="rgba(171,157,185,0.9)" />
                <Text style={styles.actionText}>Email</Text>
              </View>
              <Text style={styles.actionValue}>sarah@example.com</Text>
            </Pressable>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="options" size={18} color={SOTERIA.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Preferences</Text>
            </View>

            <ToggleRow
              icon="location-outline"
              title="Share location by default"
              subtitle="Only during active sessions"
              value={shareDefault}
              onValueChange={setShareDefault}
            />

            <ToggleRow
              icon="moon-outline"
              title="Quiet mode"
              subtitle="Mute non-urgent notifications"
              value={quietMode}
              onValueChange={setQuietMode}
            />
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                <Ionicons name="call" size={18} color="#ef4444" />
              </View>
              <Text style={styles.cardTitle}>Emergency Contact</Text>
            </View>

            <Field label="Contact Name" value={emgName} onChangeText={setEmgName} />
            <Field
              label="Phone Number"
              value={emgPhone}
              onChangeText={setEmgPhone}
              keyboardType="phone-pad"
            />

            <Pressable style={styles.primaryGhostBtn}>
              <Ionicons name="checkmark-circle-outline" size={18} color={SOTERIA.colors.primary} />
              <Text style={styles.primaryGhostText}>Save Emergency Contact</Text>
            </Pressable>
          </View>
        </View>

        {/* Safety + Privacy */}
        <View style={styles.sectionPad}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="shield-checkmark" size={18} color={SOTERIA.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Safety & Privacy</Text>
            </View>

            <Pressable style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(171,157,185,0.9)" />
                <Text style={styles.menuText}>Privacy settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(171,157,185,0.7)" />
            </Pressable>

            <Pressable style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Ionicons name="notifications-outline" size={18} color="rgba(171,157,185,0.9)" />
                <Text style={styles.menuText}>Notification settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(171,157,185,0.7)" />
            </Pressable>

            <Pressable style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Ionicons name="help-circle-outline" size={18} color="rgba(171,157,185,0.9)" />
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(171,157,185,0.7)" />
            </Pressable>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.sectionPad}>
          <Pressable style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* ================== Small Components ================== */

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={SOTERIA.colors.border}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: any;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View style={styles.toggleIcon}>
          <Ionicons name={icon} size={18} color={SOTERIA.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{title}</Text>
          <Text style={styles.toggleSub}>{subtitle}</Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(140,43,238,0.35)" }}
        thumbColor={value ? SOTERIA.colors.primary : "rgba(255,255,255,0.55)"}
      />
    </View>
  );
}

/* ================== Styles ================== */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },

  topBar: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(10,10,10,0.85)",
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(140,43,238,0.30)",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },

  smallMuted: { color: "rgba(171,157,185,0.9)", fontSize: 11 },
  nameText: { color: "white", fontSize: 14, fontWeight: "900" },

  rightTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { color: "white", fontSize: 18, fontWeight: "900", marginRight: 6 },
  iconBtn: { padding: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },

  sectionPad: { paddingHorizontal: 16, paddingTop: 12 },

  card: {
    backgroundColor: "#16111d",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(140,43,238,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },

  label: { color: SOTERIA.colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    color: "white",
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 14,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionText: { color: "white", fontWeight: "800" },
  actionValue: { color: "rgba(171,157,185,0.9)", fontWeight: "700" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(140,43,238,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTitle: { color: "white", fontWeight: "900" },
  toggleSub: { color: "rgba(171,157,185,0.85)", fontSize: 11, marginTop: 2 },

  primaryGhostBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(140,43,238,0.35)",
    backgroundColor: "rgba(140,43,238,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryGhostText: { color: SOTERIA.colors.primary, fontWeight: "900" },

  menuRow: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuText: { color: "white", fontWeight: "900" },

  signOutBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  signOutText: { color: "#ef4444", fontWeight: "900" },
});