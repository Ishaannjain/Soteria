import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SOTERIA } from "../theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { listenToCircle, addMemberToCircle } from "../../src/services/circleService";
import { startSafeWalkSession, listenToCircleActiveSessions } from "../../src/services/sessionService";
import { searchUsers } from "../../src/services/userService";

export default function CircleDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth() as any;
  const [circle, setCircle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [walkingSessions, setWalkingSessions] = useState(new Map());
  const [tick, setTick] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState("30");
  const [destination, setDestination] = useState("");

  // Real-time listener for circle data (members update instantly on all devices)
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsubscribe = listenToCircle(id as string, (circleData: any) => {
      setCircle(circleData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Listen for active sessions in this circle to show "Walking" badges + timers
  useEffect(() => {
    if (!id) return;
    const unsubscribe = listenToCircleActiveSessions([id as string], user?.uid || "", (sessions: any[]) => {
      setWalkingSessions(new Map(sessions.map((s) => [s.userId, s])));
    });
    return () => unsubscribe();
  }, [id, user]);

  // Tick every second to refresh countdown timers on walking badges
  useEffect(() => {
    if (walkingSessions.size === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [walkingSessions.size]);

  // Debounced search: fires 400ms after user stops typing
  useEffect(() => {
    if (!searchTerm.trim() || !circle) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchTerm.trim());
        const existingIds = new Set(
          circle.members?.map((m: any) => m.userId || m.email) || []
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
  }, [searchTerm, circle]);

  const handleAddMember = async (selectedUser: any) => {
    try {
      const memberData = {
        userId: selectedUser.id,
        name: selectedUser.name || selectedUser.email.split("@")[0],
        email: selectedUser.email,
        phone: selectedUser.phone || "",
      };
      await addMemberToCircle(id as string, memberData);
      setSearchResults((prev) => prev.filter((u: any) => u.id !== selectedUser.id));
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member. Try again.");
    }
  };

  const handleStartSafeWalk = async () => {
    if (!circle?.members || circle.members.length === 0) {
      Alert.alert("No Members", "Add members to your circle before starting a SafeWalk.");
      return;
    }

    const minutes = parseInt(timerMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("Invalid Timer", "Please enter a valid timer duration in minutes.");
      return;
    }

    try {
      const sessionData = {
        userId: user.uid,
        circleId: id as string,
        timerDuration: minutes,
        destination: destination.trim() || null,
      };

      await startSafeWalkSession(sessionData);
      Alert.alert("SafeWalk Started", "Your SafeWalk session has begun!");
      router.push("/(tabs)/map");
    } catch (error) {
      console.error("Error starting SafeWalk:", error);
      Alert.alert("Error", "Failed to start SafeWalk session.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={SOTERIA.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0a0a0a", "#0a0a0a"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{circle?.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Circle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Circle Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color={SOTERIA.colors.primary} />
              <Text style={styles.infoText}>
                {circle?.members?.length || 0} members
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={SOTERIA.colors.primary} />
              <Text style={styles.infoText}>
                Created {new Date(circle?.createdAt?.seconds * 1000).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Members List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <Pressable onPress={() => setShowAddMember(!showAddMember)}>
              <Ionicons
                name={showAddMember ? "close-circle" : "add-circle"}
                size={28}
                color={SOTERIA.colors.primary}
              />
            </Pressable>
          </View>

          {showAddMember && (
            <View style={styles.addMemberCard}>
              <Text style={styles.cardTitle}>Add Member</Text>

              <TextInput
                placeholder="Search by name or email"
                placeholderTextColor={SOTERIA.colors.muted}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                style={styles.input}
                autoFocus
              />

              {isSearching && (
                <ActivityIndicator size="small" color={SOTERIA.colors.primary} style={{ marginVertical: 12 }} />
              )}

              {!isSearching && searchTerm.trim().length > 0 && searchResults.length === 0 && (
                <Text style={styles.noResultsText}>No users found</Text>
              )}

              {searchResults.map((result: any) => (
                <Pressable key={result.id} style={styles.searchResultRow} onPress={() => handleAddMember(result)}>
                  <View style={styles.searchResultAvatar}>
                    <Text style={styles.searchResultAvatarText}>
                      {(result.name || result.email)[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>
                      {result.name || result.email.split("@")[0]}
                    </Text>
                    <Text style={styles.searchResultEmail}>{result.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={SOTERIA.colors.primary} />
                </Pressable>
              ))}
            </View>
          )}

          {circle?.members && circle.members.length > 0 ? (
            circle.members.map((member: any, index: number) => (
              <View key={index} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person" size={24} color={SOTERIA.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.memberName}>{member.name || member.email}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                    {member.phone && (
                      <Text style={styles.memberPhone}>{member.phone}</Text>
                    )}
                  </View>
                </View>
                {walkingSessions.has(member.userId) ? (
                  <View style={styles.walkingBadge}>
                    <View style={styles.walkingRow}>
                      <Ionicons name="walk-outline" size={12} color="#34d399" />
                      <Text style={styles.walkingText}>Walking</Text>
                    </View>
                    <Text style={styles.walkingTimer}>{getWalkTimer(walkingSessions.get(member.userId))}</Text>
                  </View>
                ) : member.status === "pending" ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={SOTERIA.colors.muted} />
              <Text style={styles.emptyText}>No members yet</Text>
              <Text style={styles.emptySubtext}>Add members to get started</Text>
            </View>
          )}
        </View>

        {/* Start SafeWalk */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start SafeWalk</Text>
          <View style={styles.safeWalkCard}>
            <Text style={styles.cardTitle}>Begin Your Journey</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Timer Duration (minutes)</Text>
              <TextInput
                placeholder="30"
                placeholderTextColor={SOTERIA.colors.muted}
                value={timerMinutes}
                onChangeText={setTimerMinutes}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destination (optional)</Text>
              <TextInput
                placeholder="Where are you going?"
                placeholderTextColor={SOTERIA.colors.muted}
                value={destination}
                onChangeText={setDestination}
                style={styles.input}
              />
            </View>

            <Pressable style={styles.startBtn} onPress={handleStartSafeWalk}>
              <Ionicons name="navigate" size={20} color="white" />
              <Text style={styles.startBtnText}>Start SafeWalk</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function getWalkTimer(session: any) {
  const startTime = session.startTime?.toDate
    ? session.startTime.toDate()
    : new Date(session.startTime);
  const remaining = Math.max(
    0,
    (session.timerDuration || 30) * 60 * 1000 - (Date.now() - startTime.getTime())
  );
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: "#16111d",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  addMemberCard: {
    backgroundColor: "#16111d",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(127,19,236,0.3)",
    marginBottom: 16,
  },
  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    color: "white",
    marginBottom: 10,
  },
  addBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: SOTERIA.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  addBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  memberCard: {
    backgroundColor: "#16111d",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(127,19,236,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },
  memberEmail: {
    color: SOTERIA.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  memberPhone: {
    color: SOTERIA.colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  walkingBadge: {
    alignItems: "center",
    backgroundColor: "rgba(52,211,153,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  walkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  walkingText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "900",
  },
  walkingTimer: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: "rgba(255,193,7,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingText: {
    color: "#ffc107",
    fontSize: 11,
    fontWeight: "900",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: SOTERIA.colors.muted,
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtext: {
    color: SOTERIA.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },

  noResultsText: {
    color: SOTERIA.colors.muted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  searchResultAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(127,19,236,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchResultAvatarText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  searchResultEmail: {
    color: SOTERIA.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  safeWalkCard: {
    backgroundColor: "#16111d",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(127,19,236,0.3)",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: SOTERIA.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  startBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: SOTERIA.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  startBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
});
