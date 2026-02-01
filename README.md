# Soteria

Inspired by the Greek goddess of protection, **Soteria** is a women-first safety app that helps users stay safe through trusted circles, real-time location sharing, emergency SOS alerts, and guided navigation to nearby safe spaces.

---

## Features

### SafeWalk Sessions
- Start timed walking sessions with real-time GPS tracking
- Automatic check-in reminders before the timer expires
- Missed check-ins automatically alert your Safety Circle
- Live route tracking on an interactive map

### Safety Circles
- Create groups of trusted contacts (family, friends, roommates)
- Share live location with circle members during walks
- Invite members via shareable links
- Support for multiple circles (roommates, family, friends, etc.)

### Emergency SOS
- One-tap emergency button
- Instantly shares real-time location with all circle members
- Sends **email alerts** to emergency contacts via EmailJS

### Nearby Safe Spots
- Discover nearby safe locations directly from the map
- Police stations, hospitals, pharmacies, fire stations
- 24/7 locations like gas stations and convenience stores
- Reroute instantly to any selected safe spot

### AI Assistant
- Conversational chat interface powered by **Google Gemini**
- Start SafeWalks, manage circles, and navigate the app via chat
- Provides safety tips and feature guidance

---

## Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Navigation:** Expo Router (file-based routing)
- **Backend:** Firebase  
  - Authentication  
  - Firestore  
  - Firebase Storage (profile images)
- **AI:** Google Gemini API
- **Maps & Routing:**  
  - Leaflet + OpenStreetMap  
  - OSRM routing
- **Places Search:** Google Places API
- **Notifications:** EmailJS
- **Language:** TypeScript

---

## Project Structure

```
soteria/
├── app/
│   ├── index.tsx              # Login / Signup screen
│   ├── safewalk-setup.tsx     # SafeWalk configuration
│   ├── explore.tsx            # Standalone explore screen
│   ├── theme.ts               # Theme & design tokens
│   ├── (tabs)/
│   │   ├── dashboard.tsx      # Home dashboard
│   │   ├── map.tsx            # SafeWalk map + safe spots bottom sheet
│   │   ├── circles.tsx        # Safety circles
│   │   ├── chat.tsx           # AI assistant chat
│   │   └── profile.tsx        # User profile
│   └── _layout.tsx            # Root layout
├── src/
│   ├── config/
│   │   ├── firebase.js        # Firebase config (env-based)
│   │   └── maps.js            # Map configuration
│   ├── contexts/              # Global React contexts
│   ├── hooks/                 # Custom hooks
│   ├── screens/
│   │   └── ChatScreen.js      # AI chat UI
│   └── services/
│       ├── authService.js
│       ├── userService.js
│       ├── circleService.js
│       ├── sessionService.js
│       ├── locationService.js
│       ├── mapService.js
│       ├── placesService.js
│       ├── chatService.js
│       └── emailService.js
├── assets/                    # Images & fonts
├── .env.example               # Environment variable template
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI  
  npm install -g expo-cli
- iOS Simulator / Android Emulator / Physical device with Expo Go

---

## Installation

### 1. Clone the repository
```
git clone https://github.com/Ishaannjain/Soteria.git
cd soteria
```

### 2. Install dependencies
```
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory using `.env.example`.

```
# Google APIs
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_GEMINI_API_KEY=

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=

# EmailJS
EXPO_PUBLIC_EMAILJS_SERVICE_ID=
EXPO_PUBLIC_EMAILJS_TEMPLATE_ID=
EXPO_PUBLIC_EMAILJS_PUBLIC_KEY=
```

Do NOT commit `.env` — ensure it is listed in `.gitignore`.

---

## Firebase Setup

1. Go to Firebase Console: https://console.firebase.google.com/
2. Create a new project
3. Enable:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Firebase Storage
4. Copy your Firebase config values into the `.env` file

Do NOT edit `firebase.js` directly — it reads from environment variables.

---

## EmailJS Setup (Required for SOS Alerts)

1. Create an account at https://www.emailjs.com/
2. Create:
   - An Email Service
   - An Email Template (for SOS alerts)
3. Copy:
   - Service ID
   - Template ID
   - Public Key
4. Add them to `.env`

Without EmailJS configured, emergency SOS emails will not work.

---

## Google APIs Setup

### Maps & Places
1. Open Google Cloud Console: https://console.cloud.google.com/
2. Enable:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
3. Create an API key and add it to `.env`

### Gemini AI
1. Visit Google AI Studio: https://makersuite.google.com/
2. Generate an API key
3. Add it to `.env`

---

## Running the App

```
npm start
```

---

## Security Notes

- Rotate all API keys if they were ever committed
- Ensure `.env` is in `.gitignore`
- Use `.env.example` for sharing config requirements
- Never expose Firebase or EmailJS keys in public repos

---

## License

MIT License

---

## Acknowledgments

- Expo — https://expo.dev/
- Firebase — https://firebase.google.com/
- OpenStreetMap — https://www.openstreetmap.org/
- OSRM — http://project-osrm.org/
- Google Gemini — https://ai.google.dev/
