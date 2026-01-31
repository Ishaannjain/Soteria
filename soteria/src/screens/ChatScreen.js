import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { sendMessage } from "../services/chatService";
import { onAuthChange, logOut } from "../services/authService";
import { getCurrentLocation, requestLocationPermission } from "../services/locationService";
import { getUserCircles } from "../services/circleService";
import {
  startSafeWalkSession,
  getActiveSession,
  getSessionHistory,
  triggerEmergency,
} from "../services/sessionService";
import { sendEmergencyAlert } from "../services/emailService";
import { getUserProfile } from "../services/userService";

const WELCOME_TEXT =
  "Hi there! I'm your Soteria Assistant. I'm here to help you stay safe and use the app with ease.\n\nYou can ask me anything — like how to start a SafeWalk, manage your Safety Circle, or what to do in an emergency. Just type below or tap a suggestion!";

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: WELCOME_TEXT,
      actions: [
        { type: "START_SAFEWALK", label: "Start a SafeWalk" },
        { type: "VIEW_CIRCLES", label: "My Safety Circles" },
      ],
    },
  ]);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userCircles, setUserCircles] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      if (user) {
        getUserCircles(user.uid).then(setUserCircles).catch(() => setUserCircles([]));
      } else {
        setUserCircles([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // --- Helpers ---

  const addMessage = (role, text, actions = []) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(36).slice(2), role, text, actions },
    ]);
  };

  const updateHistoryFromAction = (userText, botText) => {
    setGeminiHistory((prev) => [
      ...prev,
      { role: "user", parts: [{ text: userText }] },
      { role: "model", parts: [{ text: botText }] },
    ]);
  };

  // --- Send normal message to Gemini ---

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText("");
    addMessage("user", text);

    // Build hidden context so Gemini knows the user's state
    let contextPrefix = "[App Context: ";
    if (currentUser) {
      contextPrefix += "User is logged in.";
      if (userCircles.length > 0) {
        contextPrefix += ` Safety Circles available: ${userCircles.map((c) => c.name || "Unnamed").join(", ")}.`;
      } else {
        contextPrefix += " User has no Safety Circles set up yet.";
      }
    } else {
      contextPrefix += "User is NOT logged in. They need to sign in before any actions can be performed.";
    }
    contextPrefix += "]\n\n";
    const messageForGemini = contextPrefix + text;

    const updatedHistory = [
      ...geminiHistory,
      { role: "user", parts: [{ text: messageForGemini }] },
    ];

    setIsLoading(true);
    try {
      const { cleanText, actions, rawText } = await sendMessage(geminiHistory, messageForGemini);

      // Split actions: safe ones auto-execute, dangerous ones stay as buttons
      const confirmTypes = ["TRIGGER_EMERGENCY", "LOGOUT"];
      const buttonActions = actions.filter((a) => confirmTypes.includes(a.type));
      const autoActions = actions.filter((a) => !confirmTypes.includes(a.type));

      addMessage("bot", cleanText, buttonActions);
      setGeminiHistory([
        ...updatedHistory,
        { role: "model", parts: [{ text: rawText }] },
      ]);

      // Auto-execute safe actions (no button tap needed)
      autoActions.forEach((action) => executeAction(action, true));
    } catch (error) {
      console.error("Chat error:", error);
      addMessage(
        "bot",
        error.message.includes("API key")
          ? "The chatbot isn't set up yet — the Gemini API key needs to be added. Please check the app configuration."
          : `Something went wrong: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action dispatcher ---

  const executeAction = (action, autoExecuted = false) => {
    if (action.type === "TRIGGER_EMERGENCY") {
      Alert.alert(
        "Confirm Emergency",
        "This will send an emergency alert with your location to everyone in your Safety Circle. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Alert Now", style: "destructive", onPress: handleTriggerEmergency },
        ]
      );
      return;
    }
    if (action.type === "LOGOUT") {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              await logOut();
              addMessage("user", "Sign out");
              addMessage("bot", "You've been signed out. Thank you for using Soteria! Stay safe out there.");
              updateHistoryFromAction("Sign out", "User signed out successfully.");
            } catch (e) {
              addMessage("bot", "Couldn't sign out right now. Please try again.");
            }
          },
        },
      ]);
      return;
    }

    const handlers = {
      START_SAFEWALK: handleStartSafeWalk,
      GET_LOCATION: handleGetLocation,
      VIEW_CIRCLES: handleViewCircles,
      VIEW_SESSION_HISTORY: handleViewSessionHistory,
    };
    if (handlers[action.type]) handlers[action.type](action.params || {}, autoExecuted);
  };

  // --- Action: Start SafeWalk ---

  const handleStartSafeWalk = async (params = {}, autoExecuted = false) => {
    if (!autoExecuted) addMessage("user", "Start a SafeWalk session");
    setIsLoading(true);

    const destination = params.destination || null;
    const timerDuration = params.timer ? parseInt(params.timer, 10) || 30 : 30;

    // Match circle name from Gemini to an actual circle ID
    let circleId = null;
    if (params.circle && userCircles.length > 0) {
      const matched = userCircles.find(
        (c) => (c.name || "").toLowerCase().includes(params.circle.toLowerCase())
      );
      if (matched) circleId = matched.id;
    }

    try {
      if (!currentUser) {
        const msg = "You need to be logged in to start a walk. Please sign in first.";
        addMessage("bot", msg);
        updateHistoryFromAction("Start a walk", msg);
        return;
      }

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        const msg =
          "I need your location to keep you safe. Please allow location access in your device settings, then try again.";
        addMessage("bot", msg);
        updateHistoryFromAction("Start a walk", msg);
        return;
      }

      const location = await getCurrentLocation();
      const sessionId = await startSafeWalkSession({
        userId: currentUser.uid,
        circleId,
        timerDuration,
        destination,
      });

      let msg =
        "Your walk session has started!\n\n" +
        `📍 Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}\n` +
        `⏱️ Timer: ${timerDuration} minutes\n`;
      if (destination) msg += `📌 Destination: ${destination}\n`;
      msg +=
        `🆔 Session: ${sessionId}\n\n` +
        "Your location is being tracked. Remember to check in before the timer ends. Stay safe!";
      addMessage("bot", msg);
      updateHistoryFromAction("Started a walk session", msg);
    } catch (error) {
      const msg = `I couldn't start the session: ${error.message}. Please try again.`;
      addMessage("bot", msg);
      updateHistoryFromAction("Started a walk session", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action: Trigger Emergency ---

  const handleTriggerEmergency = async () => {
    addMessage("user", "Trigger an emergency alert");
    setIsLoading(true);
    try {
      if (!currentUser) {
        const msg = "You need to be logged in to trigger an emergency. Please sign in first.";
        addMessage("bot", msg);
        updateHistoryFromAction("Trigger emergency", msg);
        return;
      }

      const hasPermission = await requestLocationPermission();
      const location = hasPermission ? await getCurrentLocation() : null;

      // Trigger on active session if one exists
      const session = await getActiveSession(currentUser.uid);
      if (session) await triggerEmergency(session.id);

      // Gather recipients from all circles
      const circles = await getUserCircles(currentUser.uid);
      const recipientEmails = [];
      circles.forEach((circle) => {
        circle.members?.forEach((member) => {
          if (member.email && !recipientEmails.includes(member.email)) {
            recipientEmails.push(member.email);
          }
        });
      });

      let profile = {};
      try {
        profile = await getUserProfile(currentUser.uid);
      } catch {}

      let msg;
      if (location && recipientEmails.length > 0) {
        await sendEmergencyAlert(
          profile.name || currentUser.email,
          location,
          recipientEmails
        );
        msg =
          "🚨 Emergency alert sent!\n\n" +
          `📍 Your location (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}) has been shared with ${recipientEmails.length} contact(s) in your Safety Circle.\n\n` +
          "Please stay as safe as you can. Help is on the way.";
      } else if (recipientEmails.length === 0) {
        msg =
          "🚨 Emergency triggered!\n\n" +
          "⚠️ You don't have any contacts in your Safety Circle yet, so no one was notified.\n\n" +
          "Please add trusted contacts to your Safety Circle, or call emergency services (911) directly.";
      } else {
        msg =
          "🚨 Emergency triggered!\n\n" +
          "⚠️ We couldn't get your location, so alerts couldn't be sent with your position.\n\n" +
          "Please call emergency services (911) if you need immediate help.";
      }

      addMessage("bot", msg);
      updateHistoryFromAction("Trigger emergency", msg);
    } catch (error) {
      const msg = `There was an issue sending the alert: ${error.message}. If you're in immediate danger, please call emergency services (911).`;
      addMessage("bot", msg);
      updateHistoryFromAction("Trigger emergency", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action: Get Location ---

  const handleGetLocation = async (params = {}, autoExecuted = false) => {
    if (!autoExecuted) addMessage("user", "Show my current location");
    setIsLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        const msg =
          "I need location permission to show your location. Please allow it in your device settings.";
        addMessage("bot", msg);
        updateHistoryFromAction("Show my location", msg);
        return;
      }

      const location = await getCurrentLocation();
      const msg =
        "📍 Here's your current location:\n\n" +
        `Latitude: ${location.lat.toFixed(6)}\n` +
        `Longitude: ${location.lng.toFixed(6)}\n\n` +
        "You can share these coordinates with someone or use them to pin your spot on a map.";
      addMessage("bot", msg);
      updateHistoryFromAction("Show my location", msg);
    } catch (error) {
      const msg = `Couldn't get your location: ${error.message}. Please make sure location services are enabled.`;
      addMessage("bot", msg);
      updateHistoryFromAction("Show my location", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action: View Circles ---

  const handleViewCircles = async (params = {}, autoExecuted = false) => {
    if (!autoExecuted) addMessage("user", "Show my Safety Circles");
    setIsLoading(true);
    try {
      if (!currentUser) {
        const msg = "You need to be logged in to view your Safety Circles. Please sign in first.";
        addMessage("bot", msg);
        updateHistoryFromAction("Show Safety Circles", msg);
        return;
      }

      const circles = await getUserCircles(currentUser.uid);
      if (circles.length === 0) {
        const msg =
          "You don't have any Safety Circles yet.\n\n" +
          "A Safety Circle is a group of trusted people — like family or friends — who get notified if you ever need help.\n\n" +
          "Would you like to know how to create one? Just ask me!";
        addMessage("bot", msg);
        updateHistoryFromAction("Show Safety Circles", msg);
        return;
      }

      let msg = "👥 Your Safety Circles:\n\n";
      circles.forEach((circle, i) => {
        msg += `${i + 1}. ${circle.name || "Unnamed Circle"}\n`;
        if (circle.members?.length > 0) {
          msg += `   Members: ${circle.members.map((m) => m.name || m.email).join(", ")}\n`;
        } else {
          msg += "   No members yet\n";
        }
      });

      addMessage("bot", msg.trim());
      updateHistoryFromAction("Show Safety Circles", msg.trim());
    } catch (error) {
      const msg = `Couldn't load your circles: ${error.message}. Please try again.`;
      addMessage("bot", msg);
      updateHistoryFromAction("Show Safety Circles", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action: View Session History ---

  const formatSessionDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
    if (timestamp instanceof Date) return timestamp.toLocaleDateString();
    return new Date(timestamp).toLocaleDateString();
  };

  const handleViewSessionHistory = async (params = {}, autoExecuted = false) => {
    if (!autoExecuted) addMessage("user", "Show my session history");
    setIsLoading(true);
    try {
      if (!currentUser) {
        const msg = "You need to be logged in to view your session history.";
        addMessage("bot", msg);
        updateHistoryFromAction("Show session history", msg);
        return;
      }

      const sessions = await getSessionHistory(currentUser.uid);
      if (sessions.length === 0) {
        const msg =
          "You haven't completed any SafeWalk sessions yet.\n\n" +
          "Start your first one to begin tracking your walks!";
        addMessage("bot", msg, [{ type: "START_SAFEWALK", label: "Start a SafeWalk" }]);
        updateHistoryFromAction("Show session history", msg);
        return;
      }

      let msg = "📋 Your Recent SafeWalk Sessions:\n\n";
      sessions.slice(0, 5).forEach((session, i) => {
        const statusIcon =
          session.status === "completed" ? "✅" : session.status === "emergency" ? "🚨" : "⏳";
        const statusLabel =
          session.status === "completed" ? "Completed" : session.status === "emergency" ? "Emergency" : "Active";
        msg += `${i + 1}. ${statusIcon} ${statusLabel} — ${formatSessionDate(session.startTime)}\n`;
      });

      addMessage("bot", msg.trim());
      updateHistoryFromAction("Show session history", msg.trim());
    } catch (error) {
      const msg = `Couldn't load session history: ${error.message}. Please try again.`;
      addMessage("bot", msg);
      updateHistoryFromAction("Show session history", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---

  const renderItem = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View style={styles.messageWrapper}>
        <View style={[styles.messageRow, isUser && styles.messageRowReverse]}>
          {!isUser && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>S</Text>
            </View>
          )}
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.text}</Text>
          </View>
        </View>
        {item.actions?.length > 0 && (
          <View style={[styles.actionsRow, isUser && styles.actionsRowRight]}>
            {item.actions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.actionBtn}
                onPress={() => executeAction(action)}
                accessibilityLabel={action.label}
                accessibilityRole="button"
              >
                <Text style={styles.actionBtnText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Soteria Assistant</Text>
        <Text style={styles.headerSubtitle}>I'm here to help you stay safe</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((item) => (
          <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>
        ))}
      </ScrollView>

      {isLoading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#6C63FF" />
          <Text style={styles.typingText}>Assistant is thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxHeight={96}
          returnKeyType="send"
          accessibilityLabel="Message input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5FA",
  },
  header: {
    backgroundColor: "#6C63FF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 40 : 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "#D8D5FF",
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  messageRowReverse: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#6C63FF",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 15,
    color: "#1a1a2e",
    lineHeight: 22,
  },
  userBubbleText: {
    color: "#fff",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    paddingLeft: 40,
  },
  actionsRowRight: {
    paddingLeft: 0,
    justifyContent: "flex-end",
  },
  actionBtn: {
    backgroundColor: "#fff",
    borderColor: "#6C63FF",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  actionBtnText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    color: "#888",
    fontSize: 13,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E8E8EF",
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F0F5",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a2e",
    minHeight: 44,
  },
  sendBtn: {
    backgroundColor: "#6C63FF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#C4C1F5",
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});