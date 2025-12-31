# GPS Tracking Mechanism - How Truck Location is Tracked

## Overview

The truck location tracking system uses **GPS coordinates from the driver's mobile device** (smartphone or tablet) to track the truck's real-time position. The system supports both **mobile apps** (React Native, Flutter, etc.) and **web browsers** using the Geolocation API.

## Tracking Flow

```
Driver's Mobile Device (GPS)
    ↓
POST /api/tracking/start (Initial location)
    ↓
POST /api/tracking/location (Continuous updates every 10 seconds)
    ↓
Backend Server
    ├─ Updates Truck.currentLat/Lng (real-time position)
    ├─ Saves to TruckLocationHistory (historical trail)
    ├─ Checks geofencing (warehouse arrival detection)
    ├─ Calculates ETA (every 5 minutes)
    └─ Emits Socket.IO events (real-time updates)
    ↓
Frontend Dashboard (Live Map Display)
```

## Step-by-Step Process

### 1. **Initialization - Start Tracking**

When a driver accepts an assignment and starts their journey:

**Mobile App/Web Browser:**
```javascript
// Get current GPS location
const location = await getCurrentPosition();

// Start tracking
POST /api/tracking/start
{
  "assignmentId": "uuid",
  "lat": 28.6139,    // Driver's current latitude
  "lng": 77.2090     // Driver's current longitude
}
```

**Backend Action:**
- Stores start location in `TruckAssignment.startLocationLat/Lng`
- Records `startTrackingAt` timestamp
- Updates assignment status to `en_route_to_warehouse`
- Emits `truck:tracking:started` Socket.IO event

### 2. **Continuous Location Updates**

The mobile app sends GPS coordinates every **10 seconds**:

**Mobile App:**
```javascript
// Set up location tracking interval
setInterval(async () => {
  const location = await getCurrentPosition();
  
  POST /api/tracking/location
  {
    "truckId": "uuid",
    "lat": 28.6145,           // Current latitude
    "lng": 77.2095,           // Current longitude
    "speed": 45.5,            // Speed in km/h (optional)
    "heading": 180,           // Direction in degrees (optional)
    "timestamp": "2025-12-31T05:52:00Z"
  }
}, 10000); // Every 10 seconds
```

**Backend Processing (in `updateLocation` endpoint):**

1. **Validates Coordinates**
   - Checks lat/lng are within valid ranges (-90 to 90, -180 to 180)
   - Rate limits to max 1 update per 10 seconds per truck

2. **Updates Truck Table**
   ```sql
   UPDATE trucks SET
     currentLat = 28.6145,
     currentLng = 77.2095,
     lastLocationUpdate = NOW()
   WHERE id = 'truck-uuid'
   ```

3. **Saves to History**
   ```sql
   INSERT INTO truck_location_history (
     truckId, truckAssignmentId, lat, lng, speed, heading, timestamp
   ) VALUES (...)
   ```

4. **Geofencing Check**
   - Calculates distance to warehouse using Haversine formula
   - If within **100 meters** of warehouse and status is `en_route_to_warehouse`:
     - Automatically updates status to `picked_up`
     - Sets `warehouseArrivedAt` timestamp
     - Sends admin notifications
     - Emits `truck:warehouse:arrived` event

5. **ETA Calculation** (every 5 minutes)
   - Uses Google Maps/Mapbox Directions API
   - Calculates route-based ETA to dealer location
   - Updates `TruckAssignment.currentEta`
   - Emits `truck:eta:updated` event

6. **Real-Time Broadcasting**
   - Emits `truck:location:update` via Socket.IO
   - Includes: lat, lng, speed, heading, status, ETA, warehouse proximity
   - Frontend receives updates in real-time

### 3. **Data Storage**

**Truck Table** (Current Position):
- `currentLat` - Latest latitude
- `currentLng` - Latest longitude  
- `lastLocationUpdate` - Timestamp of last update

**TruckLocationHistory Table** (Historical Trail):
- Stores every location update with timestamp
- Includes speed and heading data
- Used for route replay and analytics

**TruckAssignment Table** (Journey Metadata):
- `startLocationLat/Lng` - Where tracking started
- `startTrackingAt` - When tracking began
- `warehouseArrivedAt` - When reached warehouse (geofencing)
- `currentEta` - Real-time ETA to dealer

## GPS Enablement Methods

### Mobile App (Native)

**React Native:**
```javascript
import * as Location from 'expo-location';

// Request permission
const { status } = await Location.requestForegroundPermissionsAsync();

// Get current position
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.High,
});

// Watch position (continuous updates)
Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,      // Every 10 seconds
    distanceInterval: 50,     // Or every 50 meters
  },
  (location) => {
    // Send to backend
    sendLocationUpdate(location.coords);
  }
);
```

**Flutter:**
```dart
import 'package:geolocator/geolocator.dart';

// Get current position
Position position = await Geolocator.getCurrentPosition(
  desiredAccuracy: LocationAccuracy.high,
);

// Stream position updates
StreamSubscription<Position> positionStream = 
  Geolocator.getPositionStream(
    locationSettings: LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50,  // meters
    ),
  ).listen((Position position) {
    // Send to backend
    sendLocationUpdate(position);
  });
```

### Web Browser (Geolocation API)

```javascript
// Request location permission
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Send to backend
      await fetch('/api/tracking/location', {
        method: 'POST',
        body: JSON.stringify({
          truckId: 'uuid',
          lat: latitude,
          lng: longitude,
        }),
      });
    },
    (error) => console.error('Geolocation error:', error),
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
  
  // Watch position (continuous)
  navigator.geolocation.watchPosition(
    (position) => {
      // Send updates every 10 seconds
    },
    (error) => console.error(error),
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
}
```

## Real-Time Updates via Socket.IO

When location is updated, the backend broadcasts to all connected clients:

```javascript
// Backend emits
global.io.emit('truck:location:update', {
  truckId: 'uuid',
  assignmentId: 'uuid',
  orderId: 'uuid',
  driverPhone: '1234567890',
  driverName: 'John Doe',
  lat: 28.6145,
  lng: 77.2095,
  speed: 45.5,
  heading: 180,
  status: 'in_transit',
  eta: {
    timestamp: '2025-12-31T06:30:00Z',
    durationText: '45 min',
    distanceText: '35 km',
  },
  warehouseProximity: {
    distanceMeters: 500,
    isApproaching: false,
  },
  timestamp: '2025-12-31T05:52:00Z',
});
```

**Frontend listens:**
```javascript
socket.on('truck:location:update', (data) => {
  // Update map marker position
  updateTruckMarker(data.lat, data.lng);
  
  // Update ETA display
  if (data.eta) {
    updateETADisplay(data.eta);
  }
});
```

## Security & Access Control

1. **Driver Authentication**
   - Drivers can only update location for their own assignments
   - Verified by matching `driverName` or `driverPhone`

2. **Rate Limiting**
   - Maximum 1 location update per 10 seconds per truck
   - Prevents abuse and reduces server load

3. **Coordinate Validation**
   - Validates lat/lng are within valid ranges
   - Rejects invalid GPS coordinates

4. **Assignment Verification**
   - Only trucks with active assignments can send updates
   - Status must be: `assigned`, `en_route_to_warehouse`, `picked_up`, or `in_transit`

## Key Features

✅ **Real-time tracking** - Updates every 10 seconds  
✅ **Historical trail** - Complete location history stored  
✅ **Geofencing** - Automatic warehouse arrival detection (100m radius)  
✅ **ETA calculation** - Route-based ETA using Google Maps/Mapbox  
✅ **Multi-platform** - Works with mobile apps and web browsers  
✅ **Rate limiting** - Prevents excessive API calls  
✅ **Socket.IO integration** - Real-time updates to frontend  

## API Endpoints

- `POST /api/tracking/start` - Initialize tracking from driver's location
- `POST /api/tracking/location` - Update truck location (called every 10 seconds)
- `GET /api/tracking/live` - Get all active truck locations
- `GET /api/tracking/order/:orderId` - Get tracking details for an order
- `GET /api/tracking/assignment/:id/eta` - Get current ETA

## Environment Variables

For routing API (ETA calculation):
- `GOOGLE_MAPS_API_KEY` - Google Maps Directions API key
- `MAPBOX_ACCESS_TOKEN` - Mapbox Directions API token
- `ROUTING_API_PROVIDER` - 'google' or 'mapbox' (default: 'google')

