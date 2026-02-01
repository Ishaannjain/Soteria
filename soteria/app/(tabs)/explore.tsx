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
  Text,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SOTERIA } from '../theme';

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
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0a0a", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
      />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Safe Spots</Text>
        <Text style={styles.status}>{testStatus}</Text>
      </View>

      {/* Live Map with Directions */}
      <View style={[styles.mapContainer, destination && styles.mapContainerExpanded]}>
        {location ? (
          <WebView
            key={destination?.id || 'no-dest'}
            source={{ html: generateMapHtml(location.lat, location.lng, safeSpots, destination) }}
            style={styles.map}
            scrollEnabled={false}
            javaScriptEnabled={true}
          />
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={SOTERIA.colors.primary} />
            <Text style={styles.mapLoadingText}>Getting your location...</Text>
          </View>
        )}
      </View>

      {/* Navigation Info Bar */}
      {destination && (
        <View style={styles.navigationBar}>
          <View style={styles.navInfo}>
            <Text style={styles.navIcon}>{getIconForType(destination.type)}</Text>
            <View style={styles.navDetails}>
              <Text style={styles.navName}>{destination.name}</Text>
              <Text style={styles.navAddress}>{destination.address}</Text>
            </View>
          </View>
          <Pressable style={styles.cancelButton} onPress={clearNavigation}>
            <Text style={styles.cancelButtonText}>End</Text>
          </Pressable>
        </View>
      )}

      {/* Quick Actions - Hide when navigating */}
      {!destination && (
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionButton, styles.emergencyButton, (!location || loading) && styles.buttonDisabled]}
            onPress={navigateToNearest}
            disabled={loading || !location}
          >
            <Ionicons name="navigate" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>
              Get to Nearest Safe Spot
            </Text>
          </Pressable>
        </View>
      )}

      {/* Filter Tabs - Hide when navigating */}
      {!destination && (
        <View style={styles.filterTabs}>
          <Pressable
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterTab, activeFilter === 'emergency' && styles.filterTabActive]}
            onPress={() => setActiveFilter('emergency')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'emergency' && styles.filterTabTextActive]}>
              Emergency
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterTab, activeFilter === 'safe' && styles.filterTabActive]}
            onPress={() => setActiveFilter('safe')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'safe' && styles.filterTabTextActive]}>
              24/7 Open
            </Text>
          </Pressable>
        </View>
      )}

      {/* Search Button - Hide when navigating */}
      {!destination && (
        <Pressable
          style={[styles.searchButton, (!location || loading) && styles.buttonDisabled]}
          onPress={findSafeSpots}
          disabled={loading || !location}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.searchButtonText}>
                Find Safe Spots Nearby
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Results List - Hide when navigating */}
      {!destination && (
        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {getFilteredSpots().length > 0 ? (
            getFilteredSpots().map((spot) => (
              <Pressable
                key={spot.id}
                style={styles.spotCard}
                onPress={() => showDirections(spot)}
              >
                <View style={styles.spotIcon}>
                  <Text style={styles.spotIconText}>
                    {getIconForType(spot.type)}
                  </Text>
                </View>
                <View style={styles.spotInfo}>
                  <Text style={styles.spotName}>{spot.name}</Text>
                  <Text style={styles.spotAddress}>{spot.address}</Text>
                  <View style={styles.spotMeta}>
                    <Text style={styles.spotDistance}>
                      {formatDistance(spot.distance)}
                    </Text>
                    <Text style={styles.spotType}>
                      {spot.type.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.directionsButton}>
                  <Ionicons name="navigate" size={18} color={SOTERIA.colors.primary} />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="rgba(171,157,185,0.5)" />
              <Text style={styles.emptyStateText}>
                {location
                  ? 'Tap "Find Safe Spots Nearby" to search'
                  : 'Waiting for location...'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 12,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
  },
  status: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(171,157,185,0.9)',
  },
  mapContainer: {
    height: 180,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#16111d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mapContainerExpanded: {
    height: 320,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16111d',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(171,157,185,0.9)',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 14,
    backgroundColor: '#16111d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  navAddress: {
    fontSize: 12,
    color: 'rgba(171,157,185,0.9)',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  quickActions: {
    padding: 16,
    paddingBottom: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: SOTERIA.colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(171,157,185,0.9)',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  searchButton: {
    margin: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: SOTERIA.colors.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#16111d',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  spotIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(140,43,238,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotIconText: {
    fontSize: 22,
  },
  spotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  spotName: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    marginBottom: 2,
  },
  spotAddress: {
    fontSize: 12,
    color: 'rgba(171,157,185,0.7)',
    marginBottom: 4,
  },
  spotMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  spotDistance: {
    fontSize: 12,
    color: SOTERIA.colors.primary,
    fontWeight: '700',
  },
  spotType: {
    fontSize: 11,
    color: 'rgba(171,157,185,0.6)',
    textTransform: 'capitalize',
  },
  directionsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(140,43,238,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(171,157,185,0.7)',
    textAlign: 'center',
  },
});
