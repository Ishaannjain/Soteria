# Soteria

Inspired by the Greek goddess of protection, Soteria is a women-first safety app that builds trust circles with friends and family, sends SOS alerts, and guides users to the nearest safe spaces.

## Features

### SafeWalk Sessions

- Start timed walking sessions with real-time GPS tracking
- Automatic check-in reminders before the timer expires
- Missed check-ins automatically alert your Safety Circle
- View your walking route on an interactive map

### Safety Circles

- Create groups of trusted contacts (family, friends, roommates)
- Share your location with circle members during walks
- Invite members via shareable links
- Multiple circles for different contexts

### Emergency SOS

- One-tap emergency button sends instant alerts
- Shares your real-time location with all circle members
- Email notifications sent to emergency contacts

### Nearby Safe Spots

- Discover nearby safe locations when you need them
- Police stations, hospitals, pharmacies, fire stations
- 24/7 locations like gas stations and convenience stores
- Tap to redirect your route to any safe spot

### AI Assistant

- Conversational interface powered by Google Gemini
- Start walks, view circles, and trigger actions via chat
- Get safety tips and app guidance

## Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Navigation:** Expo Router (file-based routing)
- **Backend:** Firebase (Authentication, Firestore)
- **AI:** Google Gemini API
- **Maps:** Leaflet + OpenStreetMap, OSRM routing
- **Places:** Google Places API
- **Notifications:** EmailJS
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator / Physical device with Expo Go

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/Ishaannjain/Soteria.git
   cd soteria
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   Create a `.env` file in the `soteria` directory:

   ```env
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Configure Firebase

   Update `src/config/firebase.js` with your Firebase project credentials.

5. Start the development server

   ```bash
   npx expo start
   ```

6. Run on your device
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

## Project Structure

```
soteria/
├── app/                    # Screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── dashboard.tsx  # Home dashboard
│   │   ├── map.tsx        # SafeWalk map view
│   │   ├── circles.tsx    # Safety circles
│   │   ├── explore.tsx    # Explore safe spots
│   │   └── profile.tsx    # User profile
│   ├── circle/            # Circle management
│   └── _layout.tsx        # Root layout
├── src/
│   ├── config/            # App configuration
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   └── services/          # API & business logic
│       ├── authService.js
│       ├── circleService.js
│       ├── sessionService.js
│       ├── locationService.js
│       ├── mapService.js
│       ├── placesService.js
│       ├── chatService.js
│       └── emailService.js
└── assets/                # Images and fonts
```

## API Keys Setup

### Google Maps & Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
3. Create an API key and add it to `.env`

### Google Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create an API key
3. Add it to `.env`

### Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Copy your config to `src/config/firebase.js`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Expo](https://expo.dev/) for the amazing React Native framework
- [Firebase](https://firebase.google.com/) for backend services
- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [OSRM](http://project-osrm.org/) for routing services
