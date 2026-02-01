import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SOTERIA } from "../theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { getUserCircles, createCircle, getCircle, addMemberToCircle } from "../../src/services/circleService";

interface Circle {
  id: string;
  name: string;
  members?: Array<{ userId?: string; email?: string; name?: string; phone?: string }>;
  ownerId?: string;
}

export default function CirclesScreen() {
  const { user, profile } = useAuth() as any;
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (user) {
      loadCircles();
    }
  }, [user]);

  const loadCircles = async () => {
    try {
      setLoading(true);
      const userCircles = await getUserCircles(user.uid);
      setCircles(userCircles);
    } catch (error) {
      console.error("Error loading circles:", error);
      Alert.alert("Error", "Failed to load circles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCircle = async () => {
    try {
      const circleName = await promptForCircleName();
      if (!circleName) return;

      const circleData = {
        name: circleName,
        members: [
          {
            userId: user.uid,
            name: profile?.name || user.email?.split('@')[0] || "User",
            email: user.email,
            phone: profile?.phone || "",
          },
        ],
      };

      await createCircle(user.uid, circleData);
      Alert.alert("Success", `Circle "${circleName}" created!`);
      loadCircles();
    } catch (error) {
      console.error("Error creating circle:", error);
      Alert.alert("Error", "Failed to create circle");
    }
  };

  const promptForCircleName = (): Promise<string | null> => {
    return new Promise((resolve) => {
      Alert.prompt(
        "Create New Circle",
        "Enter a name for your circle:",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
          { text: "Create", onPress: (name?: string) => resolve(name || null) },
        ],
        "plain-text"
      );
    });
  };

  const handleJoinCircle = async () => {
    if (!joinCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }

    try {
      // Get circle details
      const circle = await getCircle(joinCode.trim());

      // Check if already a member
      const isMember = (circle as Circle).members?.some(
        (member: any) => member.email === user.email || member.userId === user.uid
      );

      if (isMember) {
        Alert.alert("Already Joined", "You're already a member of this circle!");
        setShowJoinModal(false);
        setJoinCode("");
        return;
      }

      // Add user to circle
      const memberData = {
        userId: user.uid,
        name: profile?.name || user.email?.split('@')[0] || "User",
        email: user.email,
        phone: profile?.phone || "",
        status: "active",
      };

      await addMemberToCircle(joinCode.trim(), memberData);
      Alert.alert("Success", `You've joined "${(circle as Circle).name}"!`);
      setShowJoinModal(false);
      setJoinCode("");
      loadCircles();
    } catch (error) {
      console.error("Error joining circle:", error);
      Alert.alert("Error", "Failed to join circle. Check the code and try again.");
    }
  };
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
          <Pressable style={styles.primaryBtn} onPress={handleCreateCircle}>
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.primaryBtnText}>Create New Circle</Text>
          </Pressable>
        </View>

        {/* Join Circle */}
        <View style={styles.sectionPad}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => setShowJoinModal(!showJoinModal)}
          >
            <Ionicons name="enter" size={20} color={SOTERIA.colors.primary} />
            <Text style={styles.secondaryBtnText}>Join Circle with Code</Text>
          </Pressable>

          {showJoinModal && (
            <View style={styles.joinModal}>
              <Text style={styles.modalTitle}>Enter Invite Code</Text>
              <TextInput
                placeholder="Paste invite code here"
                placeholderTextColor={SOTERIA.colors.muted}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="none"
                style={styles.codeInput}
              />
              <Pressable style={styles.joinBtn} onPress={handleJoinCircle}>
                <Text style={styles.joinBtnText}>Join Circle</Text>
              </Pressable>
            </View>
          )}
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
          {loading ? (
            <ActivityIndicator size="large" color={SOTERIA.colors.primary} />
          ) : circles.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center", width: "100%" }}>
              <Ionicons name="people-outline" size={48} color={SOTERIA.colors.muted} />
              <Text style={{ color: SOTERIA.colors.muted, marginTop: 16, fontSize: 15 }}>
                No circles yet
              </Text>
              <Text style={{ color: SOTERIA.colors.muted, marginTop: 4, fontSize: 13 }}>
                Create your first circle to get started
              </Text>
            </View>
          ) : (
            <>
              {circles.map((circle, index) => (
                <Pressable
                  key={circle.id}
                  onPress={() => router.push(`/circle/${circle.id}`)}
                  style={{ width: "47%" }}
                >
                  <CircleTile
                    title={circle.name}
                    subtitle={`${circle.members?.length || 0} members • Active`}
                    active
                    image={`https://picsum.photos/300/300?random=${index + 11}`}
                    avatars={circle.members?.slice(0, 3).map((_: any, i: number) =>
                      `https://i.pravatar.cc/100?img=${i + 12}`
                    ) || []}
                  />
                </Pressable>
              ))}
              <Pressable style={styles.newTile} onPress={handleCreateCircle}>
                <View style={styles.newTileIcon}>
                  <Ionicons name="add" size={22} color="rgba(171,157,185,0.9)" />
                </View>
                <Text style={styles.newTileText}>New Circle</Text>
              </Pressable>
            </>
          )}
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

  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(127,19,236,0.15)",
    borderWidth: 1,
    borderColor: "rgba(127,19,236,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryBtnText: { color: SOTERIA.colors.primary, fontWeight: "900", fontSize: 15 },

  joinModal: {
    marginTop: 16,
    backgroundColor: "#16111d",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(127,19,236,0.3)",
  },
  modalTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  codeInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    color: "white",
    fontSize: 16,
    marginBottom: 12,
  },
  joinBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: SOTERIA.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },

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
    width: "100%",
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