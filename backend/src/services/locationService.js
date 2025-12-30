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

module.exports = {
  calculateDistance,
  validateCoordinates,
  findNearestWarehouse,
  findWarehousesInRadius,
  toRadians,
};

