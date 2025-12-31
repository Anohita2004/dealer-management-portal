// src/services/locationService.js
const { Warehouse } = require("../models");

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if valid
 */
function validateCoordinates(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

/**
 * Find nearest warehouse to given coordinates
 * @param {number} orderLat - Order destination latitude
 * @param {number} orderLng - Order destination longitude
 * @param {string} regionId - Optional region ID to filter warehouses
 * @returns {Promise<Object|null>} Nearest warehouse or null
 */
async function findNearestWarehouse(orderLat, orderLng, regionId = null) {
  if (!validateCoordinates(orderLat, orderLng)) {
    throw new Error("Invalid coordinates");
  }

  const whereClause = {
    isActive: true,
  };

  if (regionId) {
    whereClause.regionId = regionId;
  }

  const warehouses = await Warehouse.findAll({
    where: whereClause,
  });

  if (warehouses.length === 0) {
    return null;
  }

  let nearestWarehouse = null;
  let minDistance = Infinity;

  for (const warehouse of warehouses) {
    const distance = calculateDistance(
      orderLat,
      orderLng,
      warehouse.lat,
      warehouse.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestWarehouse = warehouse;
    }
  }

  return {
    warehouse: nearestWarehouse,
    distance: minDistance,
  };
}

/**
 * Find warehouses within a certain radius
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @param {string} regionId - Optional region ID to filter
 * @returns {Promise<Array>} Array of warehouses with distances
 */
async function findWarehousesInRadius(lat, lng, radiusKm, regionId = null) {
  if (!validateCoordinates(lat, lng)) {
    throw new Error("Invalid coordinates");
  }

  const whereClause = {
    isActive: true,
  };

  if (regionId) {
    whereClause.regionId = regionId;
  }

  const warehouses = await Warehouse.findAll({
    where: whereClause,
  });

  const warehousesInRadius = [];

  for (const warehouse of warehouses) {
    const distance = calculateDistance(lat, lng, warehouse.lat, warehouse.lng);

    if (distance <= radiusKm) {
      warehousesInRadius.push({
        warehouse,
        distance,
      });
    }
  }

  // Sort by distance (nearest first)
  warehousesInRadius.sort((a, b) => a.distance - b.distance);

  return warehousesInRadius;
}

/**
 * Check if a point is within a geofence (circular area)
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {number} targetLat - Target center latitude
 * @param {number} targetLng - Target center longitude
 * @param {number} radiusMeters - Radius in meters
 * @returns {boolean} True if point is within geofence
 */
function checkGeofence(lat, lng, targetLat, targetLng, radiusMeters) {
  if (!validateCoordinates(lat, lng) || !validateCoordinates(targetLat, targetLng)) {
    return false;
  }

  const distanceKm = calculateDistance(lat, lng, targetLat, targetLng);
  const distanceMeters = distanceKm * 1000;
  
  return distanceMeters <= radiusMeters;
}

/**
 * Check if truck is near warehouse
 * @param {number} truckLat - Truck latitude
 * @param {number} truckLng - Truck longitude
 * @param {Object} warehouse - Warehouse object with lat/lng
 * @param {number} radiusMeters - Radius in meters (default 100m)
 * @returns {boolean} True if truck is within radius of warehouse
 */
async function isNearWarehouse(truckLat, truckLng, warehouse, radiusMeters = 100) {
  if (!warehouse || !warehouse.lat || !warehouse.lng) {
    return false;
  }

  return checkGeofence(truckLat, truckLng, warehouse.lat, warehouse.lng, radiusMeters);
}

/**
 * Check if truck is near dealer
 * @param {number} truckLat - Truck latitude
 * @param {number} truckLng - Truck longitude
 * @param {Object} dealer - Dealer object with lat/lng
 * @param {number} radiusMeters - Radius in meters (default 100m)
 * @returns {boolean} True if truck is within radius of dealer
 */
async function isNearDealer(truckLat, truckLng, dealer, radiusMeters = 100) {
  if (!dealer || !dealer.lat || !dealer.lng) {
    return false;
  }

  return checkGeofence(truckLat, truckLng, dealer.lat, dealer.lng, radiusMeters);
}

/**
 * Get distance to target in meters
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {number} targetLat - Target latitude
 * @param {number} targetLng - Target longitude
 * @returns {number} Distance in meters
 */
function getDistanceMeters(lat, lng, targetLat, targetLng) {
  const distanceKm = calculateDistance(lat, lng, targetLat, targetLng);
  return distanceKm * 1000;
}

module.exports = {
  calculateDistance,
  validateCoordinates,
  findNearestWarehouse,
  findWarehousesInRadius,
  toRadians,
  checkGeofence,
  isNearWarehouse,
  isNearDealer,
  getDistanceMeters,
};

