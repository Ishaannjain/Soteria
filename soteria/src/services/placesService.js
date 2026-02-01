/**
 * Google Places API Service
 * Handles querying nearby safe locations (police stations, hospitals, 24/7 businesses)
 */

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

/**
 * Safe location types we want to find
 */
export const SAFE_LOCATION_TYPES = {
  POLICE: 'police',
  HOSPITAL: 'hospital',
  PHARMACY: 'pharmacy',
  GAS_STATION: 'gas_station',
  CONVENIENCE_STORE: 'convenience_store',
  FIRE_STATION: 'fire_station'
};

/**
 * Query Google Places API for nearby safe locations
 * @param {object} location - {lat, lng}
 * @param {number} radius - Search radius in meters (default: 2000)
 * @param {array} types - Array of location types to search for
 * @returns {Promise<array>} Array of safe locations
 */
export const findNearbySafeSpots = async (
  location,
  radius = 2000,
  types = Object.values(SAFE_LOCATION_TYPES)
) => {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not configured');
    return [];
  }

  try {
    const allResults = [];

    // Query each type separately to get comprehensive results
    for (const type of types) {
      const url = `${PLACES_API_BASE_URL}?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results) {
        const formattedResults = data.results.slice(0, 5).map(place => ({
          id: place.place_id,
          name: place.name,
          type: type,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          address: place.vicinity,
          rating: place.rating || null,
          isOpen: place.opening_hours?.open_now || null,
          distance: calculateDistance(
            location.lat,
            location.lng,
            place.geometry.location.lat,
            place.geometry.location.lng
          )
        }));

        allResults.push(...formattedResults);
      }
    }

    // Sort by distance and remove duplicates
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    );

    return uniqueResults.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error fetching nearby safe spots:', error);
    throw error;
  }
};

/**
 * Get details for a specific place
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>} Place details
 */
export const getPlaceDetails = async (placeId) => {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not configured');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,website&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return {
        name: data.result.name,
        address: data.result.formatted_address,
        phone: data.result.formatted_phone_number || null,
        website: data.result.website || null,
        hours: data.result.opening_hours?.weekday_text || []
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Format distance for display (in miles)
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (meters) => {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    // Show feet for very short distances
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
};

/**
 * Format estimated walking time
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted walking time string
 */
export const formatWalkingTime = (meters) => {
  // Average walking speed: ~3 mph = ~80 meters per minute
  const walkingSpeedMetersPerMin = 80;
  const minutes = Math.round(meters / walkingSpeedMetersPerMin);

  if (minutes < 1) {
    return '< 1 min walk';
  }
  if (minutes === 1) {
    return '1 min walk';
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours} hr walk`;
    }
    return `${hours} hr ${remainingMins} min walk`;
  }
  return `${minutes} min walk`;
};

/**
 * Get icon name for location type (for MapView markers)
 * @param {string} type - Location type
 * @returns {string} Icon identifier
 */
export const getIconForType = (type) => {
  const iconMap = {
    [SAFE_LOCATION_TYPES.POLICE]: '🚔',
    [SAFE_LOCATION_TYPES.HOSPITAL]: '🏥',
    [SAFE_LOCATION_TYPES.PHARMACY]: '💊',
    [SAFE_LOCATION_TYPES.GAS_STATION]: '⛽',
    [SAFE_LOCATION_TYPES.CONVENIENCE_STORE]: '🏪',
    [SAFE_LOCATION_TYPES.FIRE_STATION]: '🚒'
  };

  return iconMap[type] || '📍';
};
