/**
 * Map Data Service
 * Integrates location tracking with Google Places API for safe spot discovery
 */

import { getCurrentLocation } from './locationService';
import { findNearbySafeSpots, SAFE_LOCATION_TYPES, formatDistance, formatWalkingTime } from './placesService';
import { GOOGLE_MAPS_CONFIG, isGoogleMapsConfigured } from '../config/maps';

// Cache for safe spots to avoid excessive API calls
let cachedSafeSpots = [];
let lastFetchLocation = null;
let lastFetchTime = null;

/**
 * Get safe spots near user's current location
 * Uses caching to reduce API calls
 * @param {object} location - Optional {lat, lng}, if not provided will get current location
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 * @returns {Promise<array>} Array of safe locations
 */
export const getSafeSpots = async (location = null, forceRefresh = false) => {
  if (!isGoogleMapsConfigured()) {
    console.warn('Google Maps not configured - safe spots feature disabled');
    return [];
  }

  try {
    // Get current location if not provided
    const currentLocation = location || await getCurrentLocation();

    // Check if we should use cached data
    if (!forceRefresh && shouldUseCachedData(currentLocation)) {
      console.log('Using cached safe spots');
      return cachedSafeSpots;
    }

    // Fetch fresh data from Places API
    console.log('Fetching fresh safe spots from Places API');
    const safeSpots = await findNearbySafeSpots(
      currentLocation,
      GOOGLE_MAPS_CONFIG.safeSpotSearchRadius
    );

    // Update cache
    cachedSafeSpots = safeSpots;
    lastFetchLocation = currentLocation;
    lastFetchTime = Date.now();

    return safeSpots;
  } catch (error) {
    console.error('Error getting safe spots:', error);
    // Return cached data if available, even if expired
    return cachedSafeSpots;
  }
};

/**
 * Get safe spots of specific types
 * @param {array} types - Array of SAFE_LOCATION_TYPES
 * @param {object} location - Optional location
 * @returns {Promise<array>} Filtered safe locations
 */
export const getSafeSpotsByType = async (types, location = null) => {
  if (!isGoogleMapsConfigured()) {
    return [];
  }

  try {
    const currentLocation = location || await getCurrentLocation();

    const safeSpots = await findNearbySafeSpots(
      currentLocation,
      GOOGLE_MAPS_CONFIG.safeSpotSearchRadius,
      types
    );

    return safeSpots;
  } catch (error) {
    console.error('Error getting safe spots by type:', error);
    return [];
  }
};

/**
 * Get the nearest safe spot
 * @param {object} location - Optional location
 * @returns {Promise<object|null>} Nearest safe location or null
 */
export const getNearestSafeSpot = async (location = null) => {
  const safeSpots = await getSafeSpots(location);

  if (safeSpots.length === 0) {
    return null;
  }

  // Already sorted by distance in placesService
  return safeSpots[0];
};

/**
 * Get emergency locations (police, hospitals, fire stations)
 * @param {object} location - Optional location
 * @returns {Promise<array>} Emergency locations
 */
export const getEmergencyLocations = async (location = null) => {
  const emergencyTypes = [
    SAFE_LOCATION_TYPES.POLICE,
    SAFE_LOCATION_TYPES.HOSPITAL,
    SAFE_LOCATION_TYPES.FIRE_STATION
  ];

  return await getSafeSpotsByType(emergencyTypes, location);
};

/**
 * Get 24/7 open locations (gas stations, convenience stores, pharmacies)
 * @param {object} location - Optional location
 * @returns {Promise<array>} 24/7 locations
 */
export const get24HourLocations = async (location = null) => {
  const twentyFourHourTypes = [
    SAFE_LOCATION_TYPES.GAS_STATION,
    SAFE_LOCATION_TYPES.CONVENIENCE_STORE,
    SAFE_LOCATION_TYPES.PHARMACY
  ];

  return await getSafeSpotsByType(twentyFourHourTypes, location);
};

/**
 * Prepare map markers for MapView
 * Combines user location with safe spots
 * @param {object} userLocation - {lat, lng}
 * @param {array} safeSpots - Array of safe locations
 * @returns {array} Array of marker objects ready for MapView
 */
export const prepareMapMarkers = (userLocation, safeSpots = []) => {
  const markers = [];

  // Add user location marker
  if (userLocation) {
    markers.push({
      id: 'user-location',
      coordinate: {
        latitude: userLocation.lat,
        longitude: userLocation.lng
      },
      title: 'Your Location',
      description: 'Current position',
      type: 'user',
      pinColor: '#007AFF' // Blue
    });
  }

  // Add safe spot markers
  safeSpots.forEach(spot => {
    markers.push({
      id: spot.id,
      coordinate: {
        latitude: spot.location.lat,
        longitude: spot.location.lng
      },
      title: spot.name,
      description: `${spot.address} • ${formatDistance(spot.distance)} • ${formatWalkingTime(spot.distance)}`,
      type: spot.type,
      pinColor: getPinColorForType(spot.type)
    });
  });

  return markers;
};

/**
 * Get map region that fits all markers
 * @param {array} markers - Array of marker objects
 * @returns {object} Region object for MapView
 */
export const getRegionForMarkers = (markers) => {
  if (markers.length === 0) {
    return {
      latitude: 0,
      longitude: 0,
      ...GOOGLE_MAPS_CONFIG.defaultRegion
    };
  }

  if (markers.length === 1) {
    return {
      latitude: markers[0].coordinate.latitude,
      longitude: markers[0].coordinate.longitude,
      ...GOOGLE_MAPS_CONFIG.defaultRegion
    };
  }

  // Calculate bounding box
  let minLat = markers[0].coordinate.latitude;
  let maxLat = markers[0].coordinate.latitude;
  let minLng = markers[0].coordinate.longitude;
  let maxLng = markers[0].coordinate.longitude;

  markers.forEach(marker => {
    minLat = Math.min(minLat, marker.coordinate.latitude);
    maxLat = Math.max(maxLat, marker.coordinate.latitude);
    minLng = Math.min(minLng, marker.coordinate.longitude);
    maxLng = Math.max(maxLng, marker.coordinate.longitude);
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = (maxLat - minLat) * 1.5; // Add 50% padding
  const lngDelta = (maxLng - minLng) * 1.5;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, 0.01),
    longitudeDelta: Math.max(lngDelta, 0.01)
  };
};

/**
 * Clear cached safe spots
 */
export const clearSafeSpotCache = () => {
  cachedSafeSpots = [];
  lastFetchLocation = null;
  lastFetchTime = null;
  console.log('Safe spot cache cleared');
};

// ===== HELPER FUNCTIONS =====

/**
 * Check if cached data should be used
 * @param {object} currentLocation - Current location
 * @returns {boolean}
 */
const shouldUseCachedData = (currentLocation) => {
  // No cache available
  if (!lastFetchTime || !lastFetchLocation || cachedSafeSpots.length === 0) {
    return false;
  }

  // Check if cache is expired (based on refresh interval)
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  if (timeSinceLastFetch > GOOGLE_MAPS_CONFIG.safeSpotRefreshInterval) {
    return false;
  }

  // Check if user has moved significantly (more than 500m from last fetch)
  const distance = calculateDistance(
    lastFetchLocation.lat,
    lastFetchLocation.lng,
    currentLocation.lat,
    currentLocation.lng
  );

  return distance < 500; // Use cache if moved less than 500m
};

/**
 * Calculate distance between two points (simplified)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Get pin color based on location type
 */
const getPinColorForType = (type) => {
  const colorMap = {
    [SAFE_LOCATION_TYPES.POLICE]: '#0066CC',      // Blue
    [SAFE_LOCATION_TYPES.HOSPITAL]: '#FF0000',     // Red
    [SAFE_LOCATION_TYPES.PHARMACY]: '#00CC66',     // Green
    [SAFE_LOCATION_TYPES.GAS_STATION]: '#FF9900',  // Orange
    [SAFE_LOCATION_TYPES.CONVENIENCE_STORE]: '#9966FF', // Purple
    [SAFE_LOCATION_TYPES.FIRE_STATION]: '#CC0000'  // Dark Red
  };

  return colorMap[type] || '#666666'; // Gray default
};
