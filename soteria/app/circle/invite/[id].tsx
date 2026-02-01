import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SOTERIA } from "../../theme";
import { useAuth } from "../../../src/contexts/AuthContext";
import { getCircle, addMemberToCircle } from "../../../src/services/circleService";

interface Circle {
  id: string;
  name: string;
  members?: Array<{ userId?: string; email?: string; name?: string; phone?: string }>;
}

export default function CircleInvite() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth() as any;
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (user && id) {
      handleInvite();
    } else if (!user) {
      setLoading(false);
    }
  }, [user, id]);

  const handleInvite = async () => {
    try {
      setLoading(true);

      // Get circle details
      const circleData = await getCircle(id as string) as Circle;
      setCircle(circleData);

      // Check if user is already a member
      const isMember = circleData.members?.some(
        (member: any) => member.email === user.email || member.userId === user.uid
      );

      if (isMember) {
        setError("You're already a member of this circle!");
        setLoading(false);
        return;
      }

      // Add user to circle
      const memberData = {
        userId: user.uid,
        name: user.email?.split('@')[0] || "User",
        email: user.email,
        phone: "",
        status: "active",
      };

      await addMemberToCircle(id as string, memberData);
      setJoined(true);
      setLoading(false);
    } catch (err) {
      console.error("Error joining circle:", err);
      setError("Failed to join circle. Please try again.");
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#2d134d", SOTERIA.colors.bgDark, "#000000"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={64} color={SOTERIA.colors.primary} />
          </View>
          <Text style={styles.title}>Sign In Required</Text>
          <Text style={styles.subtitle}>
            You need to sign in to join this circle
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={SOTERIA.colors.primary} />
        <Text style={styles.loadingText}>Joining circle...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#2d134d", SOTERIA.colors.bgDark, "#000000"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Ionicons name="close-circle" size={64} color="#ef4444" />
          <Text style={styles.title}>Oops!</Text>
          <Text style={styles.subtitle}>{error}</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/(tabs)/circles")}
          >
            <Text style={styles.buttonText}>Go to Circles</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (joined) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#2d134d", SOTERIA.colors.bgDark, "#000000"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#34d399" />
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            You've successfully joined "{circle?.name}"
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push(`/circle/${id}`)}
          >
            <Text style={styles.buttonText}>View Circle</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/(tabs)/circles")}
          >
            <Text style={styles.secondaryButtonText}>Go to My Circles</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: "rgba(127,19,236,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    color: SOTERIA.colors.muted,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 16,
  },
  button: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    backgroundColor: SOTERIA.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
