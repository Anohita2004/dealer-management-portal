// src/services/etaService.js
// ETA Service - Calculates real-time ETA using routing APIs

const axios = require('axios');
const { TruckAssignment, Order, Dealer, Warehouse } = require('../models');
const locationService = require('./locationService');

/**
 * ETA Service - Calculates ETA using routing APIs
 */
class ETAService {
  constructor() {
    // Routing API configuration
    this.provider = process.env.ROUTING_API_PROVIDER || 'google'; // 'google' or 'mapbox'
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
    
    // Cache for ETA calculations (to avoid excessive API calls)
    this.etaCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Minimum distance change to recalculate ETA (in km)
    this.minDistanceChange = 0.5; // 500 meters
  }

  /**
   * Calculate ETA using routing API
   * @param {number} originLat - Origin latitude
   * @param {number} originLng - Origin longitude
   * @param {number} destLat - Destination latitude
   * @param {number} destLng - Destination longitude
   * @param {string} mode - Travel mode ('driving', 'walking', 'transit')
   * @returns {Promise<Object>} ETA result with duration, distance, and route
   */
  async calculateETA(originLat, originLng, destLat, destLng, mode = 'driving') {
    try {
      // Check cache first
      const cacheKey = `${originLat},${originLng},${destLat},${destLng},${mode}`;
      const cached = this.etaCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }

      let result;
      if (this.provider === 'google' && this.googleApiKey) {
        result = await this.calculateETAGoogle(originLat, originLng, destLat, destLng, mode);
      } else if (this.provider === 'mapbox' && this.mapboxAccessToken) {
        result = await this.calculateETAMapbox(originLat, originLng, destLat, destLng, mode);
      } else {
        // Fallback to simple distance-based calculation
        result = await this.calculateETASimple(originLat, originLng, destLat, destLng);
      }

      // Cache the result
      this.etaCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      // Fallback to simple calculation
      return await this.calculateETASimple(originLat, originLng, destLat, destLng);
    }
  }

  /**
   * Calculate ETA using Google Maps Directions API
   */
  async calculateETAGoogle(originLat, originLng, destLat, destLng, mode = 'driving') {
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = {
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      mode: mode,
      key: this.googleApiKey,
      alternatives: false,
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];
    
    return {
      durationSeconds: leg.duration.value,
      durationText: leg.duration.text,
      distanceMeters: leg.distance.value,
      distanceText: leg.distance.text,
      polyline: route.overview_polyline.points,
      provider: 'google',
    };
  }

  /**
   * Calculate ETA using Mapbox Directions API
   */
  async calculateETAMapbox(originLat, originLng, destLat, destLng, mode = 'driving') {
    const profile = mode === 'driving' ? 'driving' : mode;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originLng},${originLat};${destLng},${destLat}`;
    const params = {
      access_token: this.mapboxAccessToken,
      geometries: 'geojson',
      overview: 'simplified',
    };

    const response = await axios.get(url, { params });
    
    if (response.data.code !== 'Ok') {
      throw new Error(`Mapbox API error: ${response.data.code}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];
    
    return {
      durationSeconds: Math.round(leg.duration),
      durationText: this.formatDuration(Math.round(leg.duration)),
      distanceMeters: Math.round(leg.distance),
      distanceText: this.formatDistance(Math.round(leg.distance)),
      polyline: route.geometry,
      provider: 'mapbox',
    };
  }

  /**
   * Simple fallback ETA calculation based on distance and average speed
   */
  async calculateETASimple(originLat, originLng, destLat, destLng) {
    const distanceKm = locationService.calculateDistance(originLat, originLng, destLat, destLng);
    const averageSpeedKmh = 50; // Average truck speed in km/h
    const durationHours = distanceKm / averageSpeedKmh;
    const durationSeconds = Math.round(durationHours * 3600);

    return {
      durationSeconds,
      durationText: this.formatDuration(durationSeconds),
      distanceMeters: Math.round(distanceKm * 1000),
      distanceText: this.formatDistance(Math.round(distanceKm * 1000)),
      polyline: null,
      provider: 'simple',
    };
  }

  /**
   * Update ETA for a truck assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object>} Updated ETA
   */
  async updateETAForAssignment(assignmentId) {
    try {
      const assignment = await TruckAssignment.findByPk(assignmentId, {
        include: [
          {
            model: Order,
            as: 'order',
            include: [
              {
                model: Dealer,
                as: 'dealer',
                attributes: ['id', 'lat', 'lng'],
              },
            ],
          },
          {
            model: Warehouse,
            as: 'warehouse',
            attributes: ['id', 'lat', 'lng'],
          },
          {
            model: require('../models').Truck,
            as: 'truck',
            attributes: ['id', 'currentLat', 'currentLng'],
          },
        ],
      });

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Determine current location
      let currentLat, currentLng;
      if (assignment.truck && assignment.truck.currentLat && assignment.truck.currentLng) {
        currentLat = assignment.truck.currentLat;
        currentLng = assignment.truck.currentLng;
      } else if (assignment.startLocationLat && assignment.startLocationLng) {
        currentLat = assignment.startLocationLat;
        currentLng = assignment.startLocationLng;
      } else {
        throw new Error('No current location available');
      }

      // Determine destination based on status
      let destLat, destLng;
      if (assignment.status === 'en_route_to_warehouse' || assignment.status === 'assigned') {
        // Going to warehouse
        if (!assignment.warehouse || !assignment.warehouse.lat || !assignment.warehouse.lng) {
          throw new Error('Warehouse location not available');
        }
        destLat = assignment.warehouse.lat;
        destLng = assignment.warehouse.lng;
      } else if (assignment.status === 'picked_up' || assignment.status === 'in_transit') {
        // Going to dealer
        if (!assignment.order?.dealer || !assignment.order.dealer.lat || !assignment.order.dealer.lng) {
          throw new Error('Dealer location not available');
        }
        destLat = assignment.order.dealer.lat;
        destLng = assignment.order.dealer.lng;
      } else {
        throw new Error('Invalid assignment status for ETA calculation');
      }

      // Calculate ETA
      const etaResult = await this.calculateETA(currentLat, currentLng, destLat, destLng);
      
      // Calculate ETA timestamp
      const etaTimestamp = new Date(Date.now() + etaResult.durationSeconds * 1000);

      // Update assignment
      assignment.currentEta = etaTimestamp;
      await assignment.save();

      return {
        eta: etaTimestamp,
        durationSeconds: etaResult.durationSeconds,
        durationText: etaResult.durationText,
        distanceMeters: etaResult.distanceMeters,
        distanceText: etaResult.distanceText,
        polyline: etaResult.polyline,
        provider: etaResult.provider,
      };
    } catch (error) {
      console.error('Error updating ETA for assignment:', error);
      throw error;
    }
  }

  /**
   * Get route polyline for map display
   * @param {number} originLat - Origin latitude
   * @param {number} originLng - Origin longitude
   * @param {number} destLat - Destination latitude
   * @param {number} destLng - Destination longitude
   * @returns {Promise<string>} Polyline string
   */
  async getRoutePolyline(originLat, originLng, destLat, destLng) {
    const result = await this.calculateETA(originLat, originLng, destLat, destLng);
    return result.polyline;
  }

  /**
   * Format duration in seconds to human-readable text
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }

  /**
   * Format distance in meters to human-readable text
   */
  formatDistance(meters) {
    if (meters >= 1000) {
      const km = (meters / 1000).toFixed(1);
      return `${km} km`;
    }
    return `${meters} m`;
  }

  /**
   * Clear ETA cache (useful for testing or manual refresh)
   */
  clearCache() {
    this.etaCache.clear();
  }
}

module.exports = new ETAService();

