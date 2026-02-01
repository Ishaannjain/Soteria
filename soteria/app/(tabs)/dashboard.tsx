import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SOTERIA } from "../theme";
import { router } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { getUserCircles } from "../../src/services/circleService";
import { getActiveSession, triggerEmergency } from "../../src/services/sessionService";

interface Circle {
  id: string;
  name: string;
  members?: any[];
}

export default function Dashboard() {
  const { user, profile } = useAuth() as any;
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userCircles, session] = await Promise.all([
        getUserCircles(user.uid),
        getActiveSession(user.uid)
      ]);
      console.log("Loaded circles:", userCircles);
      console.log("User ID:", user.uid);
      setCircles(userCircles);
      setActiveSession(session);
    } catch (error) {
      console.error("Error loading user data:", error);
      console.error("Full error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBeginSession = () => {
    // Navigate to SafeWalk setup screen
    router.push("/safewalk-setup" as any);
  };

  const handleSOS = async () => {
    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to send an emergency alert to your circle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            try {
              if (activeSession) {
                await triggerEmergency(activeSession.id);
                Alert.alert("SOS Sent", "Emergency alert has been sent to your circle members");
              } else {
                Alert.alert("No Active Session", "Please start a SafeWalk session first");
              }
            } catch (error) {
              console.error("Error sending SOS:", error);
              Alert.alert("Error", "Failed to send SOS");
            }
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={SOTERIA.colors.primary} />
      </View>
    );
  }
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0a0a", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.profileRow}>
          <View style={styles.avatarRing}>
            <Ionicons name="person" size={24} color={SOTERIA.colors.primary} />
          </View>
          <View>
            <Text style={styles.smallMuted}>Good evening,</Text>
            <Text style={styles.name}>{profile?.name || user?.email?.split('@')[0] || "User"}</Text>
          </View>
        </View>

        <View style={styles.rightTop}>
          <Text style={styles.logoText}>Soteria</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color="white" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Status Banner */}
        <View style={styles.sectionPad}>
          <View style={styles.statusBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#34d399" />
            <Text style={styles.statusText}>
              Your current location is secured and private.
            </Text>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.sectionPad}>
          <LinearGradient
            colors={["#8c2bee", "#4a148c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>SAFETY FIRST</Text>
              </View>
              <Text style={styles.heroTitle}>Start SafeWalk</Text>
              <Text style={styles.heroDesc}>
                Share your temporary location with your trusted circles while you're on the move.
              </Text>

              <Pressable style={styles.heroBtn} onPress={handleBeginSession}>
                <Text style={styles.heroBtnText}>Begin Session</Text>
                <Ionicons name="arrow-forward" size={18} color={SOTERIA.colors.primary} />
              </Pressable>
            </View>

            <Ionicons
              name="walk-outline"
              size={120}
              color="rgba(255,255,255,0.10)"
              style={styles.heroIcon}
            />
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionPad}>
          <Pressable
            style={styles.quickActionCard}
            onPress={() => router.push("/(tabs)/explore")}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="location" size={22} color={SOTERIA.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Find Safe Spots</Text>
              <Text style={styles.quickActionDesc}>Discover nearby safe locations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {/* My Circles */}
        <View style={[styles.sectionPad, { paddingTop: 20 }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>My Circles</Text>
            <Pressable onPress={() => router.push("/(tabs)/circles")}>
              <Text style={styles.link}>See all</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 14, paddingVertical: 10 }}>
              {loading ? (
                <ActivityIndicator color={SOTERIA.colors.primary} />
              ) : (
                <>
                  {circles.slice(0, 3).map((circle) => (
                    <CircleCard
                      key={circle.id}
                      id={circle.id}
                      title={circle.name}
                      subtitle={`${circle.members?.length || 0} members`}
                      active={false}
                    />
                  ))}
                  <Pressable style={styles.newCircle} onPress={() => router.push("/(tabs)/circles")}>
                    <Ionicons name="add-circle" size={22} color={SOTERIA.colors.primary} />
                    <Text style={styles.newCircleText}>New Circle</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Recent Sessions */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>

          <View style={{ marginTop: 12, gap: 10 }}>
            <SessionRow icon="map" title="Walk to Central Station" meta="Yesterday, 10:45 PM • 18 mins" />
            <SessionRow icon="home" title="Ride from Downtown" meta="Tue, 11:20 PM • 24 mins" />
          </View>
        </View>

        {/* SOS */}
        <View style={styles.sectionPad}>
          <Pressable style={styles.sosRow} onPress={handleSOS}>
            <Ionicons name="warning" size={18} color="#ef4444" />
            <Text style={styles.sosText}>SOS EMERGENCY</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function CircleCard({ title, subtitle, active, id }: { title: string; subtitle: string; active?: boolean; id?: string }) {
  return (
    <Pressable
      style={styles.circleCard}
      onPress={() => id && router.push(`/circle/${id}` as any)}
    >
      <View style={{ position: "relative", marginBottom: 10 }}>
        <View style={[styles.circleAvatarRing, { borderColor: active ? SOTERIA.colors.primary : "#334155" }]}>
          <Ionicons name="people" size={32} color={SOTERIA.colors.primary} />
        </View>
        {active ? <View style={styles.activeDot} /> : null}
      </View>
      <Text style={styles.circleTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.circleSub}>{subtitle}</Text>
    </Pressable>
  );
}

function SessionRow({ icon, title, meta }: { icon: any; title: string; meta: string }) {
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionLeft}>
        <View style={styles.sessionIconBox}>
          <Ionicons name={icon} size={18} color={SOTERIA.colors.primary} />
        </View>
        <View>
          <Text style={styles.sessionTitle}>{title}</Text>
          <Text style={styles.sessionMeta}>{meta}</Text>
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.completed}>COMPLETED</Text>
        <Ionicons name="checkmark-circle" size={16} color="#34d399" />
      </View>
    </View>
  );
}

function TabItem({ label, icon, active }: { label: string; icon: any; active?: boolean }) {
  return (
    <Pressable style={styles.tabItem}>
      <Ionicons
        name={icon}
        size={22}
        color={active ? SOTERIA.colors.primary : "rgba(171,157,185,0.9)"}
      />
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

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
    backgroundColor: "rgba(140,43,238,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: "100%", height: "100%" },

  smallMuted: { color: "rgba(171,157,185,0.9)", fontSize: 11 },
  name: { color: "white", fontSize: 14, fontWeight: "800" },

  rightTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { color: "white", fontSize: 18, fontWeight: "900", marginRight: 6 },
  iconBtn: { padding: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },

  sectionPad: { paddingHorizontal: 16, paddingTop: 12 },

  statusBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.20)",
    backgroundColor: "rgba(52,211,153,0.08)",
  },
  statusText: { color: "#34d399", fontSize: 12, fontWeight: "600" },

  heroCard: {
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    position: "relative",
  },
  heroIcon: { position: "absolute", right: -12, bottom: -14 },

  pill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  pillText: { color: "white", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },

  heroTitle: { color: "white", fontSize: 26, fontWeight: "900", marginBottom: 8 },
  heroDesc: { color: "rgba(255,255,255,0.80)", fontSize: 13, maxWidth: 270, marginBottom: 14 },

  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  heroBtnText: { color: SOTERIA.colors.primary, fontWeight: "900" },

  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#16111d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(140,43,238,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionTitle: { color: "white", fontSize: 15, fontWeight: "800" },
  quickActionDesc: { color: "rgba(171,157,185,0.8)", fontSize: 12, marginTop: 2 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  link: { color: SOTERIA.colors.primary, fontSize: 13, fontWeight: "800" },

  circleCard: {
    width: 128,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#16111d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  circleAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  circleAvatar: { width: "100%", height: "100%" },
  activeDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#34d399",
    borderWidth: 2,
    borderColor: "#16111d",
  },
  circleTitle: { color: "white", fontSize: 14, fontWeight: "900" },
  circleSub: { color: "rgba(171,157,185,0.9)", fontSize: 10 },

  newCircle: {
    width: 128,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(22,17,29,0.50)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newCircleText: { color: "white", fontSize: 12, fontWeight: "700" },

  sessionRow: {
    backgroundColor: "#16111d",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(140,43,238,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTitle: { color: "white", fontSize: 14, fontWeight: "900" },
  sessionMeta: { color: "rgba(171,157,185,0.85)", fontSize: 11, marginTop: 4 },

  completed: { color: "#34d399", fontSize: 10, fontWeight: "900" },

  sosRow: {
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
  sosText: { color: "#ef4444", fontWeight: "900" },

  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: "rgba(10,10,10,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tabItem: { alignItems: "center", gap: 4 },
  tabLabel: { color: "rgba(171,157,185,0.9)", fontSize: 10, fontWeight: "600" },
  tabLabelActive: { color: SOTERIA.colors.primary, fontWeight: "900" },
});