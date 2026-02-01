import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SOTERIA } from "../theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { useNotification } from "../../src/contexts/NotificationContext";
import { listenToUserCircles, createCircle, addMemberToCircle } from "../../src/services/circleService";
import { searchUsers } from "../../src/services/userService";

export default function CirclesScreen() {
  const { user } = useAuth() as any;
  const { activeCircleIds } = useNotification();
  const [circles, setCircles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = listenToUserCircles(user.uid, (userCircles: any[]) => {
      setCircles(userCircles);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateCircle = async () => {
    try {
      const circleName = await promptForCircleName();
      if (!circleName) return;

      const circleData = {
        name: circleName,
        members: [
          {
            userId: user.uid,
            name: user.email?.split('@')[0] || "User",
            email: user.email,
            phone: "",
          },
        ],
      };

      await createCircle(user.uid, circleData);
      Alert.alert("Success", `Circle "${circleName}" created!`);
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

  // Debounced search: fires 400ms after user stops typing
  useEffect(() => {
    if (!searchTerm.trim() || !selectedCircle) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchTerm.trim());
        // Filter out users already in this circle and the current user
        const existingIds = new Set(
          selectedCircle.members?.map((m: any) => m.userId || m.email) || []
        );
        const filtered = results.filter(
          (u: any) => !existingIds.has(u.id) && !existingIds.has(u.email) && u.id !== user.uid
        );
        setSearchResults(filtered);
      } catch (e) {
        console.error("Search error:", e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCircle]);

  const handleAddMember = async (selectedUser: any) => {
    try {
      const memberData = {
        userId: selectedUser.id,
        name: selectedUser.name || selectedUser.email.split("@")[0],
        email: selectedUser.email,
        phone: selectedUser.phone || "",
      };
      await addMemberToCircle(selectedCircle.id, memberData);
      setSearchResults((prev) => prev.filter((u: any) => u.id !== selectedUser.id));
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member. Try again.");
    }
  };

  const openAddMember = (circle: any) => {
    setSelectedCircle(circle);
    setSearchTerm("");
    setSearchResults([]);
    setShowAddMemberModal(true);
  };

  const closeAddMember = () => {
    setShowAddMemberModal(false);
    setSelectedCircle(null);
    setSearchTerm("");
    setSearchResults([]);
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
                    subtitle={`${circle.members?.length || 0} members${activeCircleIds.has(circle.id) ? ' • Someone is walking' : ''}`}
                    active={activeCircleIds.has(circle.id)}
                    image={`https://picsum.photos/300/300?random=${index + 11}`}
                    avatars={circle.members?.slice(0, 3).map((_: any, i: number) =>
                      `https://i.pravatar.cc/100?img=${i + 12}`
                    ) || []}
                    onAddMember={() => openAddMember(circle)}
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

      {/* Add Member Modal */}
      {showAddMemberModal && selectedCircle && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Add to "{selectedCircle.name}"</Text>
              <Pressable onPress={closeAddMember}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>

            <TextInput
              placeholder="Search by name or email"
              placeholderTextColor={SOTERIA.colors.muted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              style={styles.searchInput}
              autoFocus
            />

            {isSearching && (
              <ActivityIndicator size="small" color={SOTERIA.colors.primary} style={{ marginVertical: 16 }} />
            )}

            {!isSearching && searchTerm.trim().length > 0 && searchResults.length === 0 && (
              <Text style={styles.noResultsText}>No users found</Text>
            )}

            <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
              {searchResults.map((result: any) => (
                <Pressable
                  key={result.id}
                  style={styles.resultRow}
                  onPress={() => handleAddMember(result)}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>
                      {(result.name || result.email)[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>
                      {result.name || result.email.split("@")[0]}
                    </Text>
                    <Text style={styles.resultEmail}>{result.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={SOTERIA.colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  onAddMember,
}: {
  title: string;
  subtitle: string;
  image: string;
  avatars: string[];
  active?: boolean;
  inactive?: boolean;
  onAddMember?: () => void;
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

      <Pressable style={styles.addMemberRow} onPress={onAddMember}>
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

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  modalContainer: {
    backgroundColor: "#16111d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
  searchInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    color: "white",
    fontSize: 16,
  },
  noResultsText: {
    color: SOTERIA.colors.muted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  resultsList: {
    marginTop: 12,
    maxHeight: 260,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(127,19,236,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultAvatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  resultEmail: {
    color: SOTERIA.colors.muted,
    fontSize: 12,
    marginTop: 2,
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
