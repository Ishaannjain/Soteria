import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SOTERIA } from "../theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { getCircle, addMemberToCircle } from "../../src/services/circleService";
import { startSafeWalkSession } from "../../src/services/sessionService";

export default function CircleDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [circle, setCircle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("30");
  const [destination, setDestination] = useState("");

  useEffect(() => {
    loadCircle();
  }, [id]);

  const loadCircle = async () => {
    try {
      setLoading(true);
      const circleData = await getCircle(id as string);
      setCircle(circleData);
    } catch (error) {
      console.error("Error loading circle:", error);
      Alert.alert("Error", "Failed to load circle details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      const memberData = {
        userId: "", // Will be filled when they accept the invite
        name: memberName || memberEmail.split('@')[0],
        email: memberEmail,
        phone: memberPhone,
        status: "pending", // Mark as pending until they join
      };

      await addMemberToCircle(id as string, memberData);
      Alert.alert("Success", "Member added to circle!");
      setShowAddMember(false);
      setMemberEmail("");
      setMemberName("");
      setMemberPhone("");
      loadCircle();
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
    }
  };

  const handleShareInviteLink = async () => {
    try {
      // Copy invite code to clipboard and show instructions
      const inviteCode = id;
      const message = `Join my circle "${circle?.name}" on Soteria!\n\nInvite Code: ${inviteCode}\n\nTo join:\n1. Open Soteria app\n2. Go to Circles tab\n3. Click "Join Circle"\n4. Enter code: ${inviteCode}`;

      await Share.share({
        message: message,
        title: `Join ${circle?.name} on Soteria`,
      });
    } catch (error) {
      console.error("Error sharing invite:", error);
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
                placeholder="Email *"
                placeholderTextColor={SOTERIA.colors.muted}
                value={memberEmail}
                onChangeText={setMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                placeholder="Name (optional)"
                placeholderTextColor={SOTERIA.colors.muted}
                value={memberName}
                onChangeText={setMemberName}
                style={styles.input}
              />

              <TextInput
                placeholder="Phone (optional)"
                placeholderTextColor={SOTERIA.colors.muted}
                value={memberPhone}
                onChangeText={setMemberPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Pressable style={styles.addBtn} onPress={handleAddMember}>
                <Text style={styles.addBtnText}>Add Member</Text>
              </Pressable>
            </View>
          )}

          {circle?.members && circle.members.length > 0 ? (
            circle.members.map((member, index) => (
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
                {member.status === "pending" && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
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

        {/* Share Invite Link */}
        <View style={styles.section}>
          <Pressable style={styles.shareBtn} onPress={handleShareInviteLink}>
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.shareBtnText}>Share Invite Link</Text>
          </Pressable>
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

  shareBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: SOTERIA.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  shareBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
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
