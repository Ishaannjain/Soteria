import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

// Import map services
// @ts-ignore - JS modules without type declarations
import { getEmergencyLocations, getNearestSafeSpot, getSafeSpots } from '@/src/services/mapService';
// @ts-ignore - JS modules without type declarations
import { formatDistance, getIconForType } from '@/src/services/placesService';
// @ts-ignore - JS modules without type declarations
import { isGoogleMapsConfigured } from '@/src/config/maps';

// Type definitions for safe spots
interface SafeSpot {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: number;
  location: {
    lat: number;
    lng: number;
  };
}

// Generate map HTML with Leaflet and routing (OpenStreetMap + OSRM - FREE)
const generateMapHtml = (
  lat: number,
  lng: number,
  spots: SafeSpot[] = [],
  destination: SafeSpot | null = null
) => {
  const spotMarkers = spots.map(spot => `
    L.marker([${spot.location.lat}, ${spot.location.lng}], {
      icon: L.divIcon({
        className: 'spot-marker',
        html: '<div style="background:${destination?.id === spot.id ? '#FF3B30' : '#007AFF'};color:white;padding:4px 8px;border-radius:12px;font-size:10px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);font-weight:600;">${spot.name.substring(0, 12)}${spot.name.length > 12 ? '..' : ''}</div>',
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      })
    }).addTo(map);
  `).join('\n');

  const routingScript = destination ? `
    // Fetch route from OSRM (free routing service)
    fetch('https://router.project-osrm.org/route/v1/foot/${lng},${lat};${destination.location.lng},${destination.location.lat}?overview=full&geometries=geojson')
      .then(response => response.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          var route = data.routes[0];
          var coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);

          // Draw route line
          var routeLine = L.polyline(coordinates, {
            color: '#007AFF',
            weight: 5,
            opacity: 0.8
          }).addTo(map);

          // Fit map to show entire route
          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

          // Show route info
          var duration = Math.round(route.duration / 60);
          var distance = (route.distance / 1000).toFixed(1);

          document.getElementById('route-info').innerHTML =
            '<div style="background:white;padding:8px 12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-family:system-ui;">' +
            '<div style="font-weight:600;color:#007AFF;">' + duration + ' min walk</div>' +
            '<div style="font-size:12px;color:#666;">' + distance + ' km</div>' +
            '</div>';
        }
      })
      .catch(err => console.error('Routing error:', err));

    // Add destination marker
    var destIcon = L.divIcon({
      className: 'dest-marker',
      html: '<div style="background:#FF3B30;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:white;border-radius:50%;"></div></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker([${destination.location.lat}, ${destination.location.lng}], { icon: destIcon }).addTo(map)
      .bindPopup('<b>${destination.name}</b><br>${destination.address}');
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
        .user-marker {
          width: 16px;
          height: 16px;
          background: #007AFF;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .pulse {
          position: absolute;
          width: 32px;
          height: 32px;
          background: rgba(0, 122, 255, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
          top: -8px;
          left: -8px;
        }
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        #route-info {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="route-info"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${lat}, ${lng}], ${destination ? 14 : 15});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // User location marker with pulse effect
        var userIcon = L.divIcon({
          className: 'user-location',
          html: '<div class="pulse"></div><div class="user-marker"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        L.marker([${lat}, ${lng}], { icon: userIcon }).addTo(map)
          .bindPopup('<b>You are here</b>');

        // Safe spot markers (only show if no active navigation)
        ${!destination ? spotMarkers : ''}

        // Routing
        ${routingScript}
      </script>
    </body>
    </html>
  `;
};

export default function SafeSpotsScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'emergency' | 'safe'>('all');
  const [destination, setDestination] = useState<SafeSpot | null>(null);

  useEffect(() => {
    checkConfiguration();
    requestLocationPermission();
  }, []);

  const checkConfiguration = () => {
    const configured = isGoogleMapsConfigured();
    if (!configured) {
      setTestStatus('API Key not configured');
    } else {
      setTestStatus('Ready');
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for this feature');
        setTestStatus('Location permission denied');
        return;
      }
      setTestStatus('Getting location...');
      await getCurrentLocation();
    } catch (error) {
      console.error('Permission error:', error);
      setTestStatus('Permission error');
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setTestStatus('Getting location...');

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLocation = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };

      setLocation(userLocation);
      setTestStatus('Location found - Tap "Find Safe Spots"');
    } catch (error) {
      console.error('Location error:', error);
      setTestStatus('Failed to get location');
      Alert.alert('Location Error', 'Could not get your current location');
    } finally {
      setLoading(false);
    }
  };

  const findSafeSpots = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please wait for location to be detected');
      return;
    }

    setLoading(true);
    setTestStatus('Finding safe spots...');
    setDestination(null); // Clear any active navigation

    try {
      let spots: SafeSpot[];

      if (activeFilter === 'emergency') {
        spots = await getEmergencyLocations(location);
      } else {
        spots = await getSafeSpots(location);
      }

      setSafeSpots(spots);

      if (spots.length > 0) {
        setTestStatus(`Found ${spots.length} location(s)`);
      } else {
        setTestStatus('No locations found nearby');
        Alert.alert('No Results', 'No safe spots found in this area.');
      }
    } catch (error) {
      console.error('Safe spots error:', error);
      setTestStatus('Failed to find locations');
      Alert.alert('Error', 'Could not fetch safe spots. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const showDirections = (spot: SafeSpot) => {
    setDestination(spot);
    setTestStatus(`Navigating to ${spot.name}`);
  };

  const clearNavigation = () => {
    setDestination(null);
    setTestStatus(safeSpots.length > 0 ? `Found ${safeSpots.length} location(s)` : 'Ready');
  };

  const navigateToNearest = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please wait for location to be detected');
      return;
    }

    setLoading(true);
    setTestStatus('Finding nearest safe spot...');

    try {
      const nearest = await getNearestSafeSpot(location) as SafeSpot | null;

      if (nearest) {
        setDestination(nearest);
        setTestStatus(`Navigating to ${nearest.name}`);
      } else {
        Alert.alert('Not Found', 'No safe spots found nearby');
        setTestStatus('No safe spots found');
      }
    } catch (error) {
      console.error('Nearest spot error:', error);
      setTestStatus('Failed to find nearest spot');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSpots = () => {
    if (activeFilter === 'emergency') {
      return safeSpots.filter(s =>
        ['police', 'hospital', 'fire_station'].includes(s.type)
      );
    } else if (activeFilter === 'safe') {
      return safeSpots.filter(s =>
        ['gas_station', 'convenience_store', 'pharmacy'].includes(s.type)
      );
    }
    return safeSpots;
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Safe Spots
        </ThemedText>
        <ThemedText style={styles.status}>{testStatus}</ThemedText>
      </View>

      {/* Live Map with Directions */}
      <View style={[styles.mapContainer, destination && styles.mapContainerExpanded]}>
        {location ? (
          <WebView
            key={destination?.id || 'no-dest'} // Force re-render when destination changes
            source={{ html: generateMapHtml(location.lat, location.lng, safeSpots, destination) }}
            style={styles.map}
            scrollEnabled={false}
            javaScriptEnabled={true}
          />
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText style={styles.mapLoadingText}>Getting your location...</ThemedText>
          </View>
        )}
      </View>

      {/* Navigation Info Bar */}
      {destination && (
        <View style={styles.navigationBar}>
          <View style={styles.navInfo}>
            <ThemedText style={styles.navIcon}>{getIconForType(destination.type)}</ThemedText>
            <View style={styles.navDetails}>
              <ThemedText style={styles.navName}>{destination.name}</ThemedText>
              <ThemedText style={styles.navAddress}>{destination.address}</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={clearNavigation}>
            <ThemedText style={styles.cancelButtonText}>End</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions - Hide when navigating */}
      {!destination && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.emergencyButton]}
            onPress={navigateToNearest}
            disabled={loading || !location}
          >
            <ThemedText style={styles.actionButtonText}>
              Get to Nearest Safe Spot
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Tabs - Hide when navigating */}
      {!destination && (
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <ThemedText style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
              All
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'emergency' && styles.filterTabActive]}
            onPress={() => setActiveFilter('emergency')}
          >
            <ThemedText style={[styles.filterTabText, activeFilter === 'emergency' && styles.filterTabTextActive]}>
              Emergency
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'safe' && styles.filterTabActive]}
            onPress={() => setActiveFilter('safe')}
          >
            <ThemedText style={[styles.filterTabText, activeFilter === 'safe' && styles.filterTabTextActive]}>
              24/7 Open
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Button - Hide when navigating */}
      {!destination && (
        <TouchableOpacity
          style={[styles.searchButton, (!location || loading) && styles.searchButtonDisabled]}
          onPress={findSafeSpots}
          disabled={loading || !location}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.searchButtonText}>
              Find Safe Spots Nearby
            </ThemedText>
          )}
        </TouchableOpacity>
      )}

      {/* Results List - Hide when navigating */}
      {!destination && (
        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {getFilteredSpots().length > 0 ? (
            getFilteredSpots().map((spot) => (
              <TouchableOpacity
                key={spot.id}
                style={styles.spotCard}
                onPress={() => showDirections(spot)}
                activeOpacity={0.7}
              >
                <View style={styles.spotIcon}>
                  <ThemedText style={styles.spotIconText}>
                    {getIconForType(spot.type)}
                  </ThemedText>
                </View>
                <View style={styles.spotInfo}>
                  <ThemedText style={styles.spotName}>{spot.name}</ThemedText>
                  <ThemedText style={styles.spotAddress}>{spot.address}</ThemedText>
                  <View style={styles.spotMeta}>
                    <ThemedText style={styles.spotDistance}>
                      {formatDistance(spot.distance)}
                    </ThemedText>
                    <ThemedText style={styles.spotType}>
                      {spot.type.replace('_', ' ')}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.directionsButton}>
                  <ThemedText style={styles.directionsText}>Go</ThemedText>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateIcon}>📍</ThemedText>
              <ThemedText style={styles.emptyStateText}>
                {location
                  ? 'Tap "Find Safe Spots Nearby" to search'
                  : 'Waiting for location...'}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts?.rounded,
  },
  status: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.6,
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  mapContainerExpanded: {
    height: 350,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  navDetails: {
    flex: 1,
  },
  navName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  navAddress: {
    fontSize: 12,
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
    paddingBottom: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  searchButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spotIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotIconText: {
    fontSize: 24,
  },
  spotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  spotName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  spotAddress: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  spotMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  spotDistance: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  spotType: {
    fontSize: 12,
    opacity: 0.5,
    textTransform: 'capitalize',
  },
  directionsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
});
