import { useState, useEffect } from "react";
import { Button, ScrollView, Text, TextInput, View } from "react-native";
import { onAuthChange, signIn, signUp } from "../services/authService";
import { createCircle, getUserCircles } from "../services/circleService";
import { getCurrentLocation } from "../services/locationService";
import {
  getActiveSession,
  startSafeWalkSession,
} from "../services/sessionService";
import { useSessionMonitor } from "../hooks/useSessionMonitor";

export default function TestSafeWalk() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("30");
  const [destination, setDestination] = useState("");
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [session, setSession] = useState(null);
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState("");

  // Use session monitor hook
  const { timeRemaining, needsCheckIn, handleCheckIn, triggerSOS } =
    useSessionMonitor(session, user?.email || "User");

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadCircles(currentUser.uid);
        loadActiveSession(currentUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
      } catch (error) {
        console.error("Location error:", error);
      }
    };
    getLocation();
  }, []);

  const loadCircles = async (userId) => {
    try {
      const userCircles = await getUserCircles(userId);
      setCircles(userCircles);
      if (userCircles.length > 0) {
        setSelectedCircle(userCircles[0]);
      }
    } catch (error) {
      setMessage(`Error loading circles: ${error.message}`);
    }
  };

  const loadActiveSession = async (userId) => {
    try {
      const activeSession = await getActiveSession(userId);
      if (activeSession) {
        setSession(activeSession);
        setMessage("Active session found");
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const handleCreateTestCircle = async () => {
    if (!user) {
      setMessage("Please sign in first");
      return;
    }

    try {
      const circleData = {
        name: "Test Circle",
        members: [
          {
            userId: user.uid,
            name: user.email,
            email: user.email,
            phone: "1234567890",
          },
        ],
      };
      const newCircle = await createCircle(user.uid, circleData);
      setMessage(`Circle created: ${newCircle.name}`);
      loadCircles(user.uid);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleStartSession = async () => {
    if (!user) {
      setMessage("Please sign in first");
      return;
    }

    if (!selectedCircle) {
      setMessage("Please create or select a circle first");
      return;
    }

    try {
      const sessionData = {
        userId: user.uid,
        circleId: selectedCircle.id,
        timerDuration: parseInt(timerMinutes),
        destination: destination || null,
      };

      const newSession = await startSafeWalkSession(sessionData);
      setSession(newSession);
      setMessage("SafeWalk started!");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const onCheckIn = async () => {
    try {
      await handleCheckIn();
      setMessage("Checked in successfully! Session completed.");
      setSession(null);
    } catch (error) {
      setMessage(`Check-in error: ${error.message}`);
    }
  };

  const onSOS = async () => {
    try {
      await triggerSOS();
      setMessage("SOS triggered! Emergency alert sent.");
    } catch (error) {
      setMessage(`SOS error: ${error.message}`);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp(email, password);
      setMessage("Signed up successfully!");
    } catch (error) {
      setMessage(`Sign up error: ${error.message}`);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      setMessage("Signed in successfully!");
    } catch (error) {
      setMessage(`Sign in error: ${error.message}`);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 24, marginBottom: 20 }}>
        SafeWalk Test
      </Text>

      {/* Sign In Section (only show if not signed in) */}
      {!user && (
        <View style={{ marginBottom: 30, padding: 15, backgroundColor: "#1a1a1a", borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontSize: 18, marginBottom: 15 }}>
            Sign In to Test
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              borderWidth: 1,
              borderColor: "#444",
              color: "#fff",
              padding: 10,
              marginBottom: 10,
              borderRadius: 5,
            }}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor: "#444",
              color: "#fff",
              padding: 10,
              marginBottom: 15,
              borderRadius: 5,
            }}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Sign Up" onPress={handleSignUp} color="#4CAF50" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Sign In" onPress={handleSignIn} color="#2196F3" />
            </View>
          </View>
        </View>
      )}

      {/* User Info */}
      <Text style={{ color: "#888", marginBottom: 10 }}>
        User: {user?.email || "Not signed in"}
      </Text>

      {/* Location */}
      {location && (
        <Text style={{ color: "#888", marginBottom: 20 }}>
          Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </Text>
      )}

      {/* Circle Management */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 10 }}>
          Circles ({circles.length})
        </Text>
        {circles.map((circle, index) => (
          <Text
            key={circle.id}
            style={{
              color: selectedCircle?.id === circle.id ? "#4CAF50" : "#ccc",
              marginBottom: 5,
            }}
            onPress={() => setSelectedCircle(circle)}
          >
            {index + 1}. {circle.name} ({circle.members?.length || 0} members)
          </Text>
        ))}
        <Button title="Create Test Circle" onPress={handleCreateTestCircle} />
      </View>

      {/* Session Controls */}
      {!session ? (
        <View>
          <Text style={{ color: "#fff", fontSize: 18, marginBottom: 10 }}>
            Start SafeWalk
          </Text>

          <TextInput
            placeholder="Timer (minutes)"
            placeholderTextColor="#888"
            value={timerMinutes}
            onChangeText={setTimerMinutes}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              color: "#fff",
              padding: 10,
              marginBottom: 10,
            }}
          />

          <TextInput
            placeholder="Destination (optional)"
            placeholderTextColor="#888"
            value={destination}
            onChangeText={setDestination}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              color: "#fff",
              padding: 10,
              marginBottom: 10,
            }}
          />

          <Button title="Start SafeWalk" onPress={handleStartSession} />
        </View>
      ) : (
        <View>
          <Text style={{ color: "#fff", fontSize: 18, marginBottom: 10 }}>
            Active Session
          </Text>

          <Text style={{ color: "#4CAF50", fontSize: 32, marginBottom: 20 }}>
            {formatTime(timeRemaining)}
          </Text>

          <Text style={{ color: "#888", marginBottom: 10 }}>
            Status: {session.status}
          </Text>

          <Text style={{ color: "#888", marginBottom: 20 }}>
            Destination: {session.destination || "None"}
          </Text>

          {needsCheckIn && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ color: "#FFA500", marginBottom: 10 }}>
                ⚠️ Check-in required!
              </Text>
              <Button title="I'm Safe - Check In" onPress={onCheckIn} />
            </View>
          )}

          <Button
            title="Emergency SOS"
            onPress={onSOS}
            color="#f44336"
          />
        </View>
      )}

      {/* Message Display */}
      <Text style={{ marginTop: 20, color: "#fff" }}>{message}</Text>
    </ScrollView>
  );
}
