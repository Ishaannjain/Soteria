/**
 * Google Maps and Places API Configuration
 *
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable these APIs:
 *    - Maps SDK for Android
 *    - Maps SDK for iOS
 *    - Places API
 * 4. Create an API key in "Credentials"
 * 5. Add the key to your .env file:
 *    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
 *
 * Note: The Places API has usage costs beyond the free tier.
 * Free tier includes $200 credit per month.
 * - Nearby Search: $32 per 1000 requests
 * - Place Details: $17 per 1000 requests
 */

export const GOOGLE_MAPS_CONFIG = {
  // API Key from environment variable
  apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,

  // Default map settings
  defaultRegion: {
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  },

  // Search radius for safe spots (in meters)
  safeSpotSearchRadius: 2000, // 2km

  // Update interval for safe spots refresh (in milliseconds)
  safeSpotRefreshInterval: 300000, // 5 minutes

  // Map style (optional - can be customized)
  mapStyle: [],
};

/**
 * Check if Google Maps API is configured
 * @returns {boolean}
 */
export const isGoogleMapsConfigured = () => {
  return !!GOOGLE_MAPS_CONFIG.apiKey;
};

/**
 * Get Google Maps URL for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Google Maps URL
 */
export const getGoogleMapsUrl = (lat, lng) => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

/**
 * Get Google Maps directions URL
 * @param {object} origin - {lat, lng}
 * @param {object} destination - {lat, lng}
 * @returns {string} Google Maps directions URL
 */
export const getDirectionsUrl = (origin, destination) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
};
