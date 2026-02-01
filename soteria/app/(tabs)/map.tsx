import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { WebView } from "react-native-webview";
import { SOTERIA } from "../theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { router } from "expo-router";
import { getUserCircles } from "../../src/services/circleService";
import { getActiveSession, startSafeWalkSession } from "../../src/services/sessionService";
import { useSessionMonitor } from "../../src/hooks/useSessionMonitor";
import { getSafeSpots } from "../../src/services/mapService";
import { formatDistance, getIconForType } from "../../src/services/placesService";
import * as Location from "expo-location";

interface SafeSpot {
  id: string;
  name: string;
  type: string;
  distance: number;
  address?: string;
  location?: { lat: number; lng: number };
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface Destination {
  name: string;
  address?: string;
  location?: { lat: number; lng: number };
}

// Escape a string so it is safe to embed inside a single-quoted JS string literal
const escapeForJS = (str: string | undefined | null): string => {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
};

// Generate map HTML with Leaflet and routing
const generateMapHtml = (
  userLat: number,
  userLng: number,
  destination: Destination | null,
  safeSpots: SafeSpot[] = []
) => {
  const routingScript = destination?.location ? `
    // Fetch route from OSRM (free routing service)
    fetch('https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${destination.location.lng},${destination.location.lat}?overview=full&geometries=geojson')
      .then(response => response.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          var route = data.routes[0];
          var coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);

          // Draw route line
          var routeLine = L.polyline(coordinates, {
            color: '#8c2bee',
            weight: 5,
            opacity: 0.8
          }).addTo(map);

          // Fit map to show entire route
          map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

          // Show route info
          var duration = Math.round(route.duration / 60);
          var distanceMiles = (route.distance / 1609.34).toFixed(1);

          document.getElementById('route-info').innerHTML =
            '<div style="background:rgba(140,43,238,0.9);padding:8px 12px;border-radius:8px;color:white;font-family:system-ui;">' +
            '<div style="font-weight:600;">' + duration + ' min walk</div>' +
            '<div style="font-size:11px;opacity:0.8;">' + distanceMiles + ' mi to destination</div>' +
            '</div>';
        }
      })
      .catch(err => console.error('Routing error:', err));

    // Add destination marker
    var destIcon = L.divIcon({
      className: 'dest-marker',
      html: '<div style="background:#8c2bee;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="color:white;font-size:14px;">📍</div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([${destination.location.lat}, ${destination.location.lng}], { icon: destIcon }).addTo(map)
      .bindPopup('<b>${escapeForJS(destination.name)}</b><br>${escapeForJS(destination.address || "Destination")}');
  ` : '';

  // Generate markers for safe spots (smaller, subtle markers)
  const safeSpotMarkers = safeSpots.map(spot => {
    if (!spot.location) return '';
    return `
      L.circleMarker([${spot.location.lat}, ${spot.location.lng}], {
        radius: 6,
        fillColor: '#22c55e',
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map).bindPopup('<b>${escapeForJS(spot.name)}</b><br>${escapeForJS(spot.type.replace('_', ' '))}');
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
        .user-marker {
          width: 18px;
          height: 18px;
          background: #8c2bee;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .pulse {
          position: absolute;
          width: 36px;
          height: 36px;
          background: rgba(140, 43, 238, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
          top: -9px;
          left: -9px;
        }
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        #route-info {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="route-info"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${userLat}, ${userLng}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // User location marker with pulse effect
        var userIcon = L.divIcon({
          className: 'user-location',
          html: '<div class="pulse"></div><div class="user-marker"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map)
          .bindPopup('<b>You are here</b>');

        // Safe spot markers
        ${safeSpotMarkers}

        // Routing to destination
        ${routingScript}

        // Listen for recenter command from React Native
        window.addEventListener('message', function(event) {
          try {
            var msg = JSON.parse(event.data);
            if (msg.type === 'RECENTER') {
              map.setView([msg.lat, msg.lng], 15);
            }
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `;
};

export default function MapScreen() {
  const { user } = useAuth() as any;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<any[]>([]);
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentDestination, setCurrentDestination] = useState<Destination | null>(null);
  const [navigatingToSafeSpot, setNavigatingToSafeSpot] = useState<SafeSpot | null>(null);
  const webViewRef = useRef<any>(null);

  const handleRecenter = () => {
    if (webViewRef.current && userLocation) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: "RECENTER", lat: userLocation.lat, lng: userLocation.lng }),
        "*"
      );
    }
  };

  // Use session monitor hook
  const { timeRemaining, needsCheckIn, handleCheckIn, triggerSOS } = useSessionMonitor(
    session,
    user?.email || "User"
  );

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ["18%", "50%"], []);

  useEffect(() => {
    if (user) {
      initializeSession();
      fetchNearbySafeSpots();
    }
  }, [user]);

  const fetchNearbySafeSpots = async () => {
    try {
      setLoadingSpots(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const location = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setUserLocation(location);

      const spots = await getSafeSpots(location);
      setSafeSpots(spots.slice(0, 5));
    } catch (error) {
      console.error("Error fetching safe spots:", error);
    } finally {
      setLoadingSpots(false);
    }
  };

  const initializeSession = async () => {
    try {
      setLoading(true);
      const [activeSession, userCircles] = await Promise.all([
        getActiveSession(user.uid),
        getUserCircles(user.uid)
      ]);

      setCircles(userCircles);

      if (activeSession) {
        setSession(activeSession);
        // Set destination from session if available
        if (activeSession.destination) {
          setCurrentDestination(activeSession.destination);
        }
      } else if (userCircles.length > 0) {
        await startNewSession(userCircles[0].id);
      } else {
        Alert.alert("No Circles", "Please create a circle first", [
          { text: "OK", onPress: () => router.push("/(tabs)/circles") }
        ]);
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      Alert.alert("Error", "Failed to initialize session");
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = async (circleId: string) => {
    try {
      const sessionData = {
        userId: user.uid,
        circleId: circleId,
        timerDuration: 30,
        destination: null,
      };
      const newSession = await startSafeWalkSession(sessionData);
      setSession(newSession);
    } catch (error) {
      console.error("Error starting session:", error);
      Alert.alert("Error", "Failed to start SafeWalk session");
    }
  };

  const handleReached = async () => {
    try {
      // handleCheckIn clears all intervals and completes the session
      await handleCheckIn();
      // Clear session state to prevent any lingering activity
      setSession(null);
      Alert.alert("Great!", "You've reached your destination safely!", [
        { text: "OK", onPress: () => router.push("/(tabs)/dashboard") }
      ]);
    } catch (error) {
      console.error("Error completing session:", error);
      Alert.alert("Error", "Failed to complete session");
    }
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
              await triggerSOS();
              Alert.alert("SOS Sent", "Emergency alert has been sent to your circle members");
            } catch (error) {
              console.error("Error sending SOS:", error);
              Alert.alert("Error", "Failed to send SOS");
            }
          }
        }
      ]
    );
  };

  const handleSafeSpotPress = (spot: SafeSpot) => {
    if (!spot.location) {
      Alert.alert("Error", "Location not available for this spot");
      return;
    }

    setNavigatingToSafeSpot(spot);
    setCurrentDestination({
      name: spot.name,
      address: spot.address,
      location: spot.location,
    });
  };

  const handleCancelSafeSpotNavigation = () => {
    setNavigatingToSafeSpot(null);
    // Restore original destination from session
    if (session?.destination) {
      setCurrentDestination(session.destination);
    } else {
      setCurrentDestination(null);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return { mm: "--", ss: "--" };
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return { mm, ss };
  };

  const { mm, ss } = formatTime(timeRemaining);

  // Get the circle name for display
  const activeCircle = circles.find((c: any) => c.id === session?.circleId);
  const circleName = activeCircle?.name || "Your Circle";

  if (loading) {
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

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.roundBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="white" />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.topLabel}>SAFEWALK ACTIVE</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Sharing with {circleName}</Text>
          </View>
        </View>

        <Pressable style={styles.reachedBtn} onPress={handleReached}>
          <Text style={styles.reachedText}>I Reached</Text>
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

      {/* INTERACTIVE MAP */}
      <View style={styles.mapContainer}>
        {userLocation && !loadingSpots ? (
          <WebView
            ref={webViewRef}
            key={currentDestination?.name || 'no-dest'}
            source={{
              html: generateMapHtml(
                userLocation.lat,
                userLocation.lng,
                currentDestination,
                safeSpots
              )
            }}
            style={styles.map}
            scrollEnabled={false}
            javaScriptEnabled={true}
          />
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={SOTERIA.colors.primary} />
            <Text style={styles.mapLoadingText}>Getting your location...</Text>
          </View>
        )}

        {/* Recenter button */}
        <Pressable
          style={[styles.recenterBtn, navigatingToSafeSpot && styles.recenterBtnUp]}
          onPress={handleRecenter}
        >
          <Ionicons name="locate" size={20} color="white" />
        </Pressable>

        {/* SOS FLOATING BUTTON */}
        <View style={styles.sosFabWrap} pointerEvents="box-none">
          <Pressable style={styles.sosFab} onPress={handleSOS}>
            <Ionicons name="warning" size={20} color="white" />
            <Text style={styles.sosFabText}>SOS</Text>
          </Pressable>
        </View>

        {/* Navigation info overlay */}
        {navigatingToSafeSpot && (
          <View style={styles.navOverlay}>
            <View style={styles.navInfo}>
              <Text style={styles.navIcon}>{getIconForType(navigatingToSafeSpot.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>Navigating to Safe Spot</Text>
                <Text style={styles.navName}>{navigatingToSafeSpot.name}</Text>
              </View>
              <Pressable style={styles.navCancelBtn} onPress={handleCancelSafeSpotNavigation}>
                <Ionicons name="close" size={18} color="white" />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* DRAGGABLE BOTTOM SHEET */}
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
      >
        <BottomSheetScrollView style={styles.sheetInner}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Nearby Safe Spots</Text>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text style={styles.sheetLink}>View All</Text>
            </Pressable>
          </View>

          <Text style={styles.sheetSubtitle}>Tap to redirect your route</Text>

          {loadingSpots ? (
            <View style={styles.loadingSpots}>
              <ActivityIndicator size="small" color={SOTERIA.colors.primary} />
              <Text style={styles.loadingText}>Finding safe spots...</Text>
            </View>
          ) : safeSpots.length > 0 ? (
            safeSpots.map((spot) => (
              <SafeSpotItem
                key={spot.id}
                spot={spot}
                isActive={navigatingToSafeSpot?.id === spot.id}
                onPress={() => handleSafeSpotPress(spot)}
              />
            ))
          ) : (
            <View style={styles.noSpots}>
              <Ionicons name="location-outline" size={24} color="rgba(255,255,255,0.3)" />
              <Text style={styles.noSpotsText}>No safe spots found nearby</Text>
            </View>
          )}
        </BottomSheetScrollView>
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

function SafeSpotItem({
  spot,
  isActive,
  onPress
}: {
  spot: SafeSpot;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.safeSpot, isActive && styles.safeSpotActive]}
      onPress={onPress}
    >
      <View style={[styles.safeIcon, isActive && styles.safeIconActive]}>
        <Text style={{ fontSize: 22 }}>{getIconForType(spot.type)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.safeTitle} numberOfLines={1}>{spot.name}</Text>
        <Text style={styles.safeSub}>
          {spot.type.replace('_', ' ')} • {formatDistance(spot.distance)}
        </Text>
      </View>

      <View style={[styles.dirBtn, isActive && styles.dirBtnActive]}>
        <Ionicons
          name={isActive ? "checkmark" : "navigate"}
          size={18}
          color={isActive ? "white" : SOTERIA.colors.primary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },

  topBar: {
    paddingTop: Platform.OS === "ios" ? 56 : 46,
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
    backgroundColor: "rgba(255,255,255,0.1)",
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

  reachedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#22c55e",
  },
  reachedText: { color: "white", fontWeight: "900", fontSize: 11 },

  timerWrap: { alignItems: "center", marginTop: 6 },
  timerCard: {
    backgroundColor: "rgba(22,17,29,0.95)",
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

  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#16111d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "rgba(171,157,185,0.9)",
  },

  navOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  navInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(22,17,29,0.95)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(140,43,238,0.3)",
  },
  navIcon: {
    fontSize: 24,
  },
  navTitle: {
    color: SOTERIA.colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  navName: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  navCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  recenterBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(22,17,29,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  recenterBtnUp: {
    bottom: 68,
  },

  sosFabWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 999,
  },
  sosFab: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0a0a0a",
  },
  sosFabText: { color: "white", fontSize: 9, fontWeight: "900", marginTop: 2 },

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

  sheetInner: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  sheetLink: { color: SOTERIA.colors.primary, fontWeight: "800", fontSize: 12 },
  sheetSubtitle: {
    color: "rgba(171,157,185,0.7)",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },

  loadingSpots: { alignItems: "center", paddingVertical: 20, gap: 8 },
  loadingText: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  noSpots: { alignItems: "center", paddingVertical: 20, gap: 8 },
  noSpotsText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },

  safeSpot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 8,
  },
  safeSpotActive: {
    backgroundColor: "rgba(140,43,238,0.15)",
    borderColor: "rgba(140,43,238,0.4)",
  },
  safeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(140,43,238,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  safeIconActive: {
    backgroundColor: "rgba(140,43,238,0.35)",
  },
  safeTitle: { color: "white", fontWeight: "900", fontSize: 14 },
  safeSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  dirBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(140,43,238,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dirBtnActive: {
    backgroundColor: SOTERIA.colors.primary,
  },
});
