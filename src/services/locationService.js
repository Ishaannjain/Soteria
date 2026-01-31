import * as Location from "expo-location";

/**
 * Request location permissions from user
 * @returns {Promise<boolean>} Permission granted
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.error("Location permission denied");
      return false;
    }

    console.log("Location permission granted");
    return true;
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return false;
  }
};

/**
 * Get current location
 * @returns {Promise<object>} {lat, lng}
 */
export const getCurrentLocation = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    throw error;
  }
};

/**
 * Start watching location (updates every 30 seconds)
 * @param {function} callback - Function to call with new location
 * @returns {object} Location subscription (call .remove() to stop)
 */
export const startLocationTracking = async (callback) => {
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 10, // or 10 meters movement
      },
      (location) => {
        callback({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          timestamp: new Date(),
        });
      },
    );

    return subscription;
  } catch (error) {
    console.error("Error starting location tracking:", error);
    throw error;
  }
};
