import React from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SOTERIA } from "../theme";

export default function CirclesScreen() {
  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0a0a0a", "#0a0a0a"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Circles</Text>
        <Pressable style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Create New Circle */}
        <View style={styles.sectionPad}>
          <Pressable style={styles.primaryBtn}>
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.primaryBtnText}>Create New Circle</Text>
          </Pressable>
        </View>

        {/* Quick Security Check */}
        <View style={styles.sectionPad}>
          <View style={styles.alertCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Quick Security Check</Text>
              <Text style={styles.alertDesc}>
                Ensure your SOS alerts are reaching all circle members.
              </Text>
            </View>

            <Pressable style={styles.alertBtn}>
              <Text style={styles.alertBtnText}>Check Status</Text>
            </Pressable>
          </View>
        </View>

        {/* Section header */}
        <View style={[styles.sectionPad, styles.rowBetween]}>
          <Text style={styles.sectionTitle}>Active Circles</Text>
          <Pressable>
            <Text style={styles.link}>View All</Text>
          </Pressable>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          <CircleTile
            title="Family"
            subtitle="4 members • Active"
            active
            image="https://picsum.photos/300/300?random=11"
            avatars={[
              "https://i.pravatar.cc/100?img=12",
              "https://i.pravatar.cc/100?img=22",
              "https://i.pravatar.cc/100?img=32",
            ]}
          />

          <CircleTile
            title="Solo Hike"
            subtitle="2 members • Active"
            active
            image="https://picsum.photos/300/300?random=12"
            avatars={["https://i.pravatar.cc/100?img=45", "https://i.pravatar.cc/100?img=46"]}
          />

          <CircleTile
            title="Uni Friends"
            subtitle="3 members • Inactive"
            image="https://picsum.photos/300/300?random=13"
            avatars={[
              "https://i.pravatar.cc/100?img=55",
              "https://i.pravatar.cc/100?img=56",
              "https://i.pravatar.cc/100?img=57",
            ]}
            inactive
          />

          <Pressable style={styles.newTile}>
            <View style={styles.newTileIcon}>
              <Ionicons name="add" size={22} color="rgba(171,157,185,0.9)" />
            </View>
            <Text style={styles.newTileText}>New Circle</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function CircleTile({
  title,
  subtitle,
  image,
  avatars,
  active,
  inactive,
}: {
  title: string;
  subtitle: string;
  image: string;
  avatars: string[];
  active?: boolean;
  inactive?: boolean;
}) {
  return (
    <View style={[styles.tile, inactive ? { opacity: 0.75 } : null]}>
      <View style={styles.tileImageWrap}>
        <Image source={{ uri: image }} style={styles.tileImage} />
        <View
          style={[
            styles.statusDot,
            { backgroundColor: active ? "#34d399" : "rgba(148,163,184,0.6)" },
          ]}
        />
      </View>

      <Text style={styles.tileTitle}>{title}</Text>

      <View style={styles.avatarRow}>
        {avatars.slice(0, 3).map((a, idx) => (
          <Image key={idx} source={{ uri: a }} style={styles.smallAvatar} />
        ))}
        <View style={styles.moreAvatar}>
          <Text style={styles.moreAvatarText}>+1</Text>
        </View>
      </View>

      <Text style={styles.tileSub}>{subtitle}</Text>

      <Pressable style={styles.addMemberRow}>
        <Ionicons name="person-add" size={14} color={SOTERIA.colors.primary} />
        <Text style={styles.addMemberText}>Add Member</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },

  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(10,10,10,0.85)",
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  iconBtn: { padding: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },

  sectionPad: { paddingHorizontal: 16, paddingTop: 14 },

  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: SOTERIA.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: 15 },

  alertCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#16111d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertTitle: { color: "white", fontSize: 15, fontWeight: "900" },
  alertDesc: { color: "rgba(171,157,185,0.85)", fontSize: 12, marginTop: 6 },
  alertBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(127,19,236,0.15)",
    borderWidth: 1,
    borderColor: "rgba(127,19,236,0.30)",
  },
  alertBtnText: { color: SOTERIA.colors.primary, fontWeight: "900", fontSize: 12 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  link: { color: SOTERIA.colors.primary, fontSize: 13, fontWeight: "800" },

  grid: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  tile: {
    width: "47%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#16111d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  tileImageWrap: { position: "relative" },
  tileImage: { width: "100%", height: 140, borderRadius: 12 },
  statusDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#16111d",
  },

  tileTitle: { color: "white", fontSize: 15, fontWeight: "900", marginTop: 10 },

  avatarRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  smallAvatar: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: SOTERIA.colors.primary,
    marginRight: -8,
  },
  moreAvatar: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: SOTERIA.colors.primary,
    backgroundColor: "rgba(127,19,236,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  moreAvatarText: { color: "white", fontSize: 10, fontWeight: "900" },

  tileSub: { color: "rgba(171,157,185,0.85)", fontSize: 11, marginTop: 10 },

  addMemberRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  addMemberText: { color: SOTERIA.colors.primary, fontWeight: "900", fontSize: 12 },

  newTile: {
    width: "47%",
    height: 240,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(22,17,29,0.50)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  newTileIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  newTileText: { color: "rgba(171,157,185,0.9)", fontWeight: "800" },
});