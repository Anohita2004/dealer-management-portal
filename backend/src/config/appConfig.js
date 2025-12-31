// src/config/appConfig.js
// Application configuration (non-database settings)

require('dotenv').config();

module.exports = {
  // Routing API Configuration
  routing: {
    // Provider: 'google' or 'mapbox'
    provider: process.env.ROUTING_API_PROVIDER || 'google',
    
    // Google Maps API
    google: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      directionsUrl: 'https://maps.googleapis.com/maps/api/directions/json',
    },
    
    // Mapbox API
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN,
      directionsUrl: 'https://api.mapbox.com/directions/v5/mapbox',
    },
  },
  
  // GPS Tracking Configuration
  gps: {
    // Geofencing radius in meters
    warehouseGeofenceRadius: parseInt(process.env.WAREHOUSE_GEOFENCE_RADIUS) || 100,
    dealerGeofenceRadius: parseInt(process.env.DEALER_GEOFENCE_RADIUS) || 100,
    
    // Location update rate limit in milliseconds
    locationUpdateRateLimit: parseInt(process.env.LOCATION_UPDATE_RATE_LIMIT) || 10000, // 10 seconds
    
    // ETA update interval in milliseconds
    etaUpdateInterval: parseInt(process.env.ETA_UPDATE_INTERVAL) || 5 * 60 * 1000, // 5 minutes
    
    // Minimum distance change to recalculate ETA (in km)
    minDistanceChangeForETA: parseFloat(process.env.MIN_DISTANCE_CHANGE_FOR_ETA) || 0.5, // 500 meters
  },
};

