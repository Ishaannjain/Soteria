import { GoogleGenerativeAI } from "@google/generative-ai";

// PASTE YOUR GEMINI API KEY HERE — get one free at https://aistudio.google.com
const GEMINI_API_KEY = "AIzaSyDgWkGgGIswCVERkvjI_oRJZsVNq0r8FA0";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Soteria Assistant, a friendly and accessible chatbot built into the Soteria personal safety app. Help all users — including people with disabilities, elderly users, and anyone needing extra support — feel safe and confident.

About Soteria:
- A personal safety app for walking and traveling alone.
- Users create "Safety Circles" — groups of trusted contacts notified during emergencies.
- Users start "SafeWalk Sessions" — timed walks with GPS tracking. Missed check-ins auto-alert the Safety Circle.
- Emergency alerts include the user's location as a Google Maps link.

User messages may start with [App Context: ...] containing info about their account (e.g. which Safety Circles they have). Use this to ask informed questions. Do NOT repeat or acknowledge the app context to the user — treat it as background info only.

When you have all the information needed to perform an action, include it at the end of your message:

[ACTIONS]
ACTION_TYPE: Friendly label | param1: value1 | param2: value2
[/ACTIONS]

Available action types and their parameters:
- START_SAFEWALK: Start a tracked walk. Params: destination (where they are going), timer (minutes, default 30), circle (name of the Safety Circle to notify). Only trigger this once you have confirmed the destination, timer, AND which circle to notify.
- TRIGGER_EMERGENCY: Send an emergency alert. No params. Requires confirmation — always ask "Are you sure?" before including this action.
- GET_LOCATION: Show the user's current GPS location. No params.
- VIEW_CIRCLES: Show the user's Safety Circles. No params.
- VIEW_SESSION_HISTORY: Show past sessions. No params.
- LOGOUT: Sign out. No params.

Conversational flow for starting a walk or notifying a circle:
- Any of these phrases mean the same thing — the user wants to start a tracked walk AND notify a circle:
  "I'm leaving", "I'm going somewhere", "inform my friends", "tell my family I'm heading out", "alert my circle", "notify my group", "let my friends know I'm going", etc.
- When you detect any of these intents:
  1. Acknowledge warmly. Note any destination or time they mentioned.
  2. Ask which Safety Circle to notify (use circle names from the app context). If they only have one circle, confirm it.
  3. If they didn't mention a destination, ask where they are going.
  4. If they didn't mention a time, ask how long they expect to be out (or suggest 30 mins as default).
  5. Once you have destination, timer, AND circle — trigger START_SAFEWALK with all params.
  6. If they have no circles, let them know and suggest adding one first.

Other things the user might ask the chatbot to do:
- "Show me where I am" or "What's my location?" → trigger GET_LOCATION
- "Show my circles" or "Who's in my group?" → trigger VIEW_CIRCLES
- "My past walks" or "History" → trigger VIEW_SESSION_HISTORY
- "I need help" or "I feel unsafe" or "I'm scared" → ask if they are safe, then suggest TRIGGER_EMERGENCY
- "Sign me out" or "Log out" → trigger LOGOUT

Rules:
- Be warm, patient, and encouraging. Use simple, clear language.
- Guide users step by step — never assume. Always confirm before acting.
- Think like the user. If they say "tell my friends I'm going to the store in 5 mins" — that's a walk + notify request. Don't overthink it.
- If a user expresses fear or distress, ask "Are you safe right now?" and suggest TRIGGER_EMERGENCY.
- Do not suggest TRIGGER_EMERGENCY otherwise.
- Never more than 3 actions at a time.
- Stay focused on safety and the app, but remain friendly if the user goes off-topic.`;

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT,
});

/**
 * Parse [ACTIONS]...[/ACTIONS] block out of Gemini's response.
 * Returns the cleaned message text and an array of { type, label } actions.
 */
export function parseActions(text) {
  const match = text.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
  if (!match) return { cleanText: text.trim(), actions: [] };

  const cleanText = text.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, "").trim();
  const actions = match[1]
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Format: ACTION_TYPE: Label | param1: value1 | param2: value2
      const segments = line.split("|").map((s) => s.trim());
      const firstSegment = segments[0];
      const colonIdx = firstSegment.indexOf(":");
      if (colonIdx === -1) return null;

      const type = firstSegment.substring(0, colonIdx).trim();
      const label = firstSegment.substring(colonIdx + 1).trim();

      // Parse remaining segments as params
      const params = {};
      segments.slice(1).forEach((seg) => {
        const eqIdx = seg.indexOf(":");
        if (eqIdx !== -1) {
          const key = seg.substring(0, eqIdx).trim();
          const val = seg.substring(eqIdx + 1).trim();
          params[key] = val;
        }
      });

      return { type, label, params };
    })
    .filter(Boolean);

  return { cleanText, actions };
}

/**
 * Send a user message to Gemini and get a response.
 * @param {Array} history - Previous turns: [{ role: 'user'|'model', parts: [{ text }] }]
 * @param {string} userMessage - The new message from the user
 * @returns {Promise<{ cleanText: string, actions: Array, rawText: string }>}
 */
export async function sendMessage(history, userMessage) {
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error(
      "Gemini API key is not set. Please add your key in src/services/chatService.js",
    );
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const responseText = result.response.text();
  const { cleanText, actions } = parseActions(responseText);

  return { cleanText, actions, rawText: responseText };
}
