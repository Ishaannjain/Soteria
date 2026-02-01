import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SOTERIA } from "./theme";
import { useAuth } from "../src/contexts/AuthContext";
import { getUserCircles, createCircle } from "../src/services/circleService";
import { startSafeWalkSession } from "../src/services/sessionService";
import * as Location from "expo-location";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Timer duration options in minutes
const TIMER_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface Circle {
  id: string;
  name: string;
  members?: any[];
}

export default function SafeWalkSetupScreen() {
  const { user } = useAuth() as any;
  const [timerDuration, setTimerDuration] = useState(30);
  const [destination, setDestination] = useState("");
  const [destinationDetails, setDestinationDetails] = useState<{
    placeId: string;
    name: string;
    address: string;
    location?: { lat: number; lng: number };
  } | null>(null);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showNewCircle, setShowNewCircle] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [creatingCircle, setCreatingCircle] = useState(false);

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
      // Auto-select first circle if available
      if (userCircles.length > 0) {
        setSelectedCircles([userCircles[0].id]);
      }
    } catch (error) {
      console.error("Error loading circles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search for places
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 3 || !GOOGLE_PLACES_API_KEY) {
      setPredictions([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Get user's current location for better results
      const { status } = await Location.requestForegroundPermissionsAsync();
      let locationBias = "";

      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        locationBias = `&location=${loc.coords.latitude},${loc.coords.longitude}&radius=50000`;
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_PLACES_API_KEY}${locationBias}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.predictions) {
        setPredictions(data.predictions.slice(0, 5));
        setShowPredictions(true);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      setPredictions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (destination && !destinationDetails) {
        searchPlaces(destination);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destination, destinationDetails, searchPlaces]);

  const selectPlace = async (prediction: PlacePrediction) => {
    setDestination(prediction.structured_formatting.main_text);
    setShowPredictions(false);
    setPredictions([]);

    // Get place details for coordinates
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        setDestinationDetails({
          placeId: prediction.place_id,
          name: prediction.structured_formatting.main_text,
          address: data.result.formatted_address,
          location: {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng,
          },
        });
      }
    } catch (error) {
      console.error("Error getting place details:", error);
      setDestinationDetails({
        placeId: prediction.place_id,
        name: prediction.structured_formatting.main_text,
        address: prediction.structured_formatting.secondary_text,
      });
    }
  };

  const toggleCircle = (circleId: string) => {
    setSelectedCircles((prev) =>
      prev.includes(circleId)
        ? prev.filter((id) => id !== circleId)
        : [...prev, circleId]
    );
  };

  const handleCreateCircle = async () => {
    if (!newCircleName.trim()) {
      Alert.alert("Error", "Please enter a circle name");
      return;
    }

    try {
      setCreatingCircle(true);
      const newCircle = (await createCircle(user.uid, { name: newCircleName.trim() })) as unknown as Circle;
      setCircles((prev) => [...prev, newCircle]);
      setSelectedCircles((prev) => [...prev, newCircle.id]);
      setNewCircleName("");
      setShowNewCircle(false);
    } catch (error) {
      console.error("Error creating circle:", error);
      Alert.alert("Error", "Failed to create circle");
    } finally {
      setCreatingCircle(false);
    }
  };

  const handleStartSafeWalk = async () => {
    if (selectedCircles.length === 0) {
      Alert.alert("Select Circle", "Please select at least one circle to share your location with");
      return;
    }

    try {
      setStarting(true);

      // Start a session for each selected circle
      const sessionPromises = selectedCircles.map((circleId) =>
        startSafeWalkSession({
          userId: user.uid,
          circleId,
          timerDuration,
          destination: destinationDetails,
        })
      );

      await Promise.all(sessionPromises);

      // Navigate to the map screen
      router.replace("/(tabs)/map");
    } catch (error) {
      console.error("Error starting SafeWalk:", error);
      Alert.alert("Error", "Failed to start SafeWalk session");
    } finally {
      setStarting(false);
    }
  };

  const clearDestination = () => {
    setDestination("");
    setDestinationDetails(null);
    setPredictions([]);
    setShowPredictions(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#0a0a0a", "#0a0a0a"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Start SafeWalk</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Timer Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-in Timer</Text>
          <Text style={styles.sectionDesc}>
            How often should we check if you're safe?
          </Text>
          <View style={styles.timerOptions}>
            {TIMER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.timerOption,
                  timerDuration === option.value && styles.timerOptionActive,
                ]}
                onPress={() => setTimerDuration(option.value)}
              >
                <Text
                  style={[
                    styles.timerOptionText,
                    timerDuration === option.value && styles.timerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Destination Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destination</Text>
          <Text style={styles.sectionDesc}>Where are you heading? (optional)</Text>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputRow}>
              <Ionicons name="location" size={20} color={SOTERIA.colors.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a place..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={destination}
                onChangeText={(text) => {
                  setDestination(text);
                  if (destinationDetails) {
                    setDestinationDetails(null);
                  }
                }}
                onFocus={() => {
                  if (predictions.length > 0) {
                    setShowPredictions(true);
                  }
                }}
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={SOTERIA.colors.primary} />
              )}
              {destination.length > 0 && !searchLoading && (
                <Pressable onPress={clearDestination}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                </Pressable>
              )}
            </View>

            {/* Autocomplete Results */}
            {showPredictions && predictions.length > 0 && (
              <View style={styles.predictions}>
                {predictions.map((prediction) => (
                  <Pressable
                    key={prediction.place_id}
                    style={styles.predictionItem}
                    onPress={() => selectPlace(prediction)}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="rgba(255,255,255,0.5)"
                    />
                    <View style={styles.predictionText}>
                      <Text style={styles.predictionMain}>
                        {prediction.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.predictionSecondary}>
                        {prediction.structured_formatting.secondary_text}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Selected Destination Card */}
          {destinationDetails && (
            <View style={styles.selectedDestination}>
              <View style={styles.selectedDestIcon}>
                <Ionicons name="flag" size={20} color={SOTERIA.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedDestName}>{destinationDetails.name}</Text>
                <Text style={styles.selectedDestAddress}>{destinationDetails.address}</Text>
              </View>
              <Pressable onPress={clearDestination}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          )}
        </View>

        {/* Circle Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share With</Text>
          <Text style={styles.sectionDesc}>
            Select circles to share your location with
          </Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={SOTERIA.colors.primary}
              style={{ marginTop: 16 }}
            />
          ) : (
            <View style={styles.circleList}>
              {circles.map((circle) => (
                <Pressable
                  key={circle.id}
                  style={[
                    styles.circleItem,
                    selectedCircles.includes(circle.id) && styles.circleItemSelected,
                  ]}
                  onPress={() => toggleCircle(circle.id)}
                >
                  <View style={styles.circleCheck}>
                    {selectedCircles.includes(circle.id) ? (
                      <Ionicons name="checkmark-circle" size={24} color={SOTERIA.colors.primary} />
                    ) : (
                      <View style={styles.circleCheckEmpty} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.circleName}>{circle.name}</Text>
                    <Text style={styles.circleMembers}>
                      {circle.members?.length || 0} members
                    </Text>
                  </View>
                  <Ionicons name="people" size={20} color="rgba(255,255,255,0.3)" />
                </Pressable>
              ))}

              {/* Create New Circle */}
              {showNewCircle ? (
                <View style={styles.newCircleInput}>
                  <TextInput
                    style={styles.newCircleTextInput}
                    placeholder="Circle name..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={newCircleName}
                    onChangeText={setNewCircleName}
                    autoFocus
                  />
                  <Pressable
                    style={styles.newCircleBtn}
                    onPress={handleCreateCircle}
                    disabled={creatingCircle}
                  >
                    {creatingCircle ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="checkmark" size={20} color="white" />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.newCircleCancelBtn}
                    onPress={() => {
                      setShowNewCircle(false);
                      setNewCircleName("");
                    }}
                  >
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.addCircleBtn}
                  onPress={() => setShowNewCircle(true)}
                >
                  <Ionicons name="add-circle-outline" size={22} color={SOTERIA.colors.primary} />
                  <Text style={styles.addCircleText}>Create New Circle</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.startBtn,
            (selectedCircles.length === 0 || starting) && styles.startBtnDisabled,
          ]}
          onPress={handleStartSafeWalk}
          disabled={selectedCircles.length === 0 || starting}
        >
          {starting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="walk" size={22} color="white" />
              <Text style={styles.startBtnText}>Start SafeWalk</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  sectionDesc: {
    color: "rgba(171,157,185,0.8)",
    fontSize: 13,
    marginBottom: 16,
  },
  timerOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timerOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  timerOptionActive: {
    backgroundColor: SOTERIA.colors.primary,
    borderColor: SOTERIA.colors.primary,
  },
  timerOptionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "700",
  },
  timerOptionTextActive: {
    color: "white",
  },
  searchContainer: {
    backgroundColor: "#16111d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 15,
  },
  predictions: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  predictionText: {
    flex: 1,
  },
  predictionMain: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  predictionSecondary: {
    color: "rgba(171,157,185,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  selectedDestination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 14,
    backgroundColor: "rgba(140,43,238,0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(140,43,238,0.25)",
  },
  selectedDestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(140,43,238,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDestName: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  selectedDestAddress: {
    color: "rgba(171,157,185,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  circleList: {
    gap: 10,
  },
  circleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#16111d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  circleItemSelected: {
    borderColor: SOTERIA.colors.primary,
    backgroundColor: "rgba(140,43,238,0.1)",
  },
  circleCheck: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  circleCheckEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  circleName: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  circleMembers: {
    color: "rgba(171,157,185,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  addCircleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "rgba(140,43,238,0.1)",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(140,43,238,0.2)",
    borderStyle: "dashed",
  },
  addCircleText: {
    color: SOTERIA.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  newCircleInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: "#16111d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SOTERIA.colors.primary,
  },
  newCircleTextInput: {
    flex: 1,
    color: "white",
    fontSize: 15,
    paddingHorizontal: 8,
  },
  newCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SOTERIA.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  newCircleCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    backgroundColor: "rgba(10,10,10,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    backgroundColor: SOTERIA.colors.primary,
    borderRadius: 16,
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnText: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
});
