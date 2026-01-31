import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { SOTERIA } from "../theme";

export default function MapScreen() {
  // ===== TIMER =====
  const [remaining, setRemaining] = useState(12 * 60 + 45); // 12:45

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // ===== BOTTOM SHEET =====
  const snapPoints = useMemo(() => ["22%", "55%"], []);

  return (
    <View style={styles.root}>
      {/* MAP BACKGROUND */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&w=1400&q=80",
        }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={styles.mapDark} />
        <LinearGradient
          colors={["rgba(25,16,34,0.85)", "transparent", "rgba(25,16,34,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.roundBtn}>
          <Ionicons name="arrow-back" size={18} color="white" />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.topLabel}>SOTERIA ACTIVE</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Sharing with Family Circle</Text>
          </View>
        </View>

        <Pressable style={styles.safeBtn}>
          <Text style={styles.safeText}>I’m Safe</Text>
        </Pressable>
      </View>

      {/* TIMER CARD */}
      <View style={styles.timerWrap}>
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Check-in In</Text>
          <View style={styles.timerRow}>
            <TimerBox value={mm} unit="MIN" />
            <Text style={styles.timerColon}>:</Text>
            <TimerBox value={ss} unit="SEC" />
          </View>
        </View>
      </View>

      {/* SOS FLOATING BUTTON */}
      <View style={styles.sosFabWrap} pointerEvents="box-none">
        <Pressable style={styles.sosFab}>
          <Ionicons name="warning" size={26} color="white" />
          <Text style={styles.sosFabText}>SOS</Text>
        </Pressable>
      </View>

      {/* DRAGGABLE BOTTOM SHEET */}
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
      >
        <BottomSheetView style={styles.sheetInner}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Nearby Safe Spots</Text>
            <Text style={styles.sheetLink}>View All</Text>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              placeholder="Search other safe locations"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.searchInput}
            />
          </View>

          <SafeSpot
            icon="medkit"
            title="24/7 Boots Pharmacy"
            sub="Trusted Partner • 200m away"
          />
          <SafeSpot
            icon="shield"
            title="Police Station South"
            sub="Official Safe Zone • 450m away"
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

function TimerBox({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.timerBox}>
        <Text style={styles.timerValue}>{value}</Text>
      </View>
      <Text style={styles.timerUnit}>{unit}</Text>
    </View>
  );
}

function SafeSpot({
  icon,
  title,
  sub,
}: {
  icon: any;
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.safeSpot}>
      <View style={styles.safeIcon}>
        <Ionicons name={icon} size={22} color={SOTERIA.colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.safeTitle}>{title}</Text>
        <Text style={styles.safeSub}>{sub}</Text>
      </View>

      <Pressable style={styles.dirBtn}>
        <Ionicons name="navigate" size={18} color={SOTERIA.colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  mapDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  topBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  topLabel: {
    color: SOTERIA.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#22c55e",
  },
  liveText: { color: "rgba(255,255,255,0.7)", fontSize: 10 },

  safeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SOTERIA.colors.primary,
  },
  safeText: { color: "white", fontWeight: "900", fontSize: 12 },

  timerWrap: { alignItems: "center", marginTop: 10 },
  timerCard: {
    backgroundColor: "rgba(25,16,34,0.85)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  timerLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
  },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timerBox: {
    backgroundColor: "rgba(140,43,238,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(140,43,238,0.25)",
  },
  timerValue: { color: "white", fontSize: 22, fontWeight: "900" },
  timerUnit: { color: "rgba(255,255,255,0.5)", fontSize: 9, marginTop: 4 },
  timerColon: { color: "white", fontSize: 20, fontWeight: "900" },

  sosFabWrap: {
    position: "absolute",
    right: 18,
    bottom: 170,
    zIndex: 999,
    elevation: 999,
  },
  sosFab: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#191022",
  },
  sosFabText: { color: "white", fontSize: 10, fontWeight: "900", marginTop: 2 },

  sheet: {
    backgroundColor: "#191022",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sheetHandle: {
    backgroundColor: "rgba(255,255,255,0.25)",
    width: 40,
  },

  sheetInner: { paddingHorizontal: 18, paddingTop: 8, gap: 14 },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  sheetLink: { color: SOTERIA.colors.primary, fontWeight: "800", fontSize: 12 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { color: "white", flex: 1 },

  safeSpot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  safeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(140,43,238,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  safeTitle: { color: "white", fontWeight: "900" },
  safeSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  dirBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(140,43,238,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});