# Frontend Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install socket.io-client react-leaflet leaflet
```

### 2. Initialize Socket.IO Connection

```javascript
// src/services/socketService.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('token') }
});

socket.on('connect', () => {
  socket.emit('authenticate', { token: localStorage.getItem('token') });
});

// Listen for location updates
socket.on('truck:location:update', (data) => {
  console.log('Location update:', data);
  // data includes: truckId, driverPhone, lat, lng, speed, heading, status, eta, warehouseProximity
});

// Listen for tracking started
socket.on('truck:tracking:started', (data) => {
  console.log('Tracking started:', data);
  // data includes: assignmentId, orderId, startLocation, warehouse
});

// Listen for warehouse arrival (geofencing detected)
socket.on('truck:warehouse:arrived', (data) => {
  console.log('Warehouse arrived:', data);
  // data includes: assignmentId, orderId, driverName, warehouse
});

// Listen for warehouse approaching
socket.on('truck:warehouse:approaching', (data) => {
  console.log('Approaching warehouse:', data);
  // data includes: assignmentId, distanceMeters, warehouse
});

// Listen for ETA updates
socket.on('truck:eta:updated', (data) => {
  console.log('ETA updated:', data);
  // data includes: assignmentId, eta, durationText, distanceText
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

### 3. Fetch Live Locations

```javascript
// GET /api/tracking/live
const response = await fetch('/api/tracking/live', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { locations } = await response.json();

// Filter by phone number
const driverLocations = locations.filter(
  loc => loc.driverPhone === '1234567890'
);
```

### 4. Display on Map

```javascript
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

<MapContainer center={[20, 77]} zoom={5}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {locations.map(loc => (
    <Marker key={loc.assignmentId} position={[loc.truck.lat, loc.truck.lng]}>
      <Popup>
        Driver: {loc.driverName} ({loc.driverPhone})
        <br />Order: {loc.orderNumber}
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

---

## 📱 Key API Endpoints

### Location Tracking
- `POST /api/tracking/start` - Start GPS tracking from driver's current location
- `POST /api/tracking/location` - Update location (mobile app)
- `GET /api/tracking/live` - Get all active locations (includes `driverPhone`, warehouse, dealer)
- `GET /api/tracking/order/:orderId` - Get order tracking details (includes all locations and ETA)
- `GET /api/tracking/assignment/:id/eta` - Get current ETA for assignment

### Fleet Management
- `GET /api/fleet/assignments` - List assignments (filtered by driver phone)
- `POST /api/fleet/assignments/:id/pickup` - Mark pickup (triggers notifications)
- `POST /api/fleet/assignments/:id/deliver` - Mark delivery (triggers notifications)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read

---

## 🔔 Socket.IO Events

### Listen to These Events:

```javascript
// Location updates (includes driverPhone)
socket.on('truck:location:update', (data) => {
  // data: { truckId, assignmentId, orderId, driverPhone, lat, lng, ... }
});

// Order tracking updates
socket.on('order:tracking:update', (data) => {
  // data: { orderId, assignment: { driverPhone, ... }, currentLocation }
});

// Tracking started
socket.on('order:tracking:started', (data) => {
  // data: { orderId, assignmentId, truckId, driverPhone }
});

// Notifications
socket.on('notification', (data) => {
  // data: { id, title, message, type, priority, actionUrl }
});
```

---

## 🗺️ Map Integration Example

```javascript
import { useLiveLocations } from './hooks/useLiveLocations';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';

function TrackingMap({ driverPhone }) {
  const { locations } = useLiveLocations(driverPhone);
  
  return (
    <MapContainer center={[20, 77]} zoom={5}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Warehouse marker (always shown) */}
      {locations
        .filter(loc => loc.warehouse?.lat && loc.warehouse?.lng)
        .map(loc => (
          <Marker 
            key={`warehouse-${loc.assignmentId}`}
            position={[loc.warehouse.lat, loc.warehouse.lng]}
            icon={warehouseIcon}
          >
            <Popup>
              <strong>Warehouse</strong><br />
              {loc.warehouse.name}
            </Popup>
          </Marker>
        ))}
      
      {/* Dealer marker (shown after pickup) */}
      {locations
        .filter(loc => loc.dealer?.lat && loc.dealer?.lng)
        .map(loc => (
          <Marker 
            key={`dealer-${loc.assignmentId}`}
            position={[loc.dealer.lat, loc.dealer.lng]}
            icon={dealerIcon}
          >
            <Popup>
              <strong>Dealer</strong><br />
              {loc.dealer.businessName}
            </Popup>
          </Marker>
        ))}
      
      {/* Truck marker (current location) */}
      {locations
        .filter(loc => loc.truck?.lat && loc.truck?.lng)
        .map(loc => (
          <Marker 
            key={loc.assignmentId}
            position={[loc.truck.lat, loc.truck.lng]}
          >
            <Popup>
              <strong>{loc.driverName}</strong><br />
              Phone: {loc.driverPhone}<br />
              Order: {loc.orderNumber}<br />
              Status: {loc.status}<br />
              {loc.currentEta && (
                <>
                  ETA: {new Date(loc.currentEta).toLocaleTimeString()}
                </>
              )}
            </Popup>
          </Marker>
        ))}
      
      {/* Start location marker (if available) */}
      {locations
        .filter(loc => loc.startLocation?.lat && loc.startLocation?.lng)
        .map(loc => (
          <Marker 
            key={`start-${loc.assignmentId}`}
            position={[loc.startLocation.lat, loc.startLocation.lng]}
            icon={startIcon}
          >
            <Popup>
              <strong>Start Location</strong>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
```

---

## 📲 Mobile App Integration

### Start GPS Tracking

```javascript
// Start tracking from driver's current location
async function startTracking(assignmentId) {
  try {
    const location = await getCurrentPosition();
    
    const response = await fetch('/api/tracking/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: assignmentId,
        lat: location.coords.latitude,
        lng: location.coords.longitude
      })
    });
    
    const data = await response.json();
    console.log('Tracking started:', data);
    // Status changes to 'en_route_to_warehouse'
  } catch (error) {
    console.error('Failed to start tracking:', error);
  }
}
```

### Send Location Updates

```javascript
// Every 10 seconds (after tracking has started)
setInterval(async () => {
  const location = await getCurrentPosition();
  
  await fetch('/api/tracking/location', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      truckId: 'uuid',
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      speed: location.coords.speed,
      heading: location.coords.heading
    })
  });
  
  // Note: Geofencing automatically detects warehouse arrival
  // Status changes to 'picked_up' when within 100m of warehouse
}, 10000);
```

### Browser Geolocation (Web App)

```javascript
// Request location permission
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Start tracking or update location
      await fetch('/api/tracking/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignmentId: assignmentId,
          lat: latitude,
          lng: longitude
        })
      });
    },
    (error) => {
      console.error('Geolocation error:', error);
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}
```

### Mark Pickup/Delivery

```javascript
// Note: Pickup is now automatic via geofencing when truck reaches warehouse (100m radius)
// Manual pickup is still available if needed:
await fetch(`/api/fleet/assignments/${assignmentId}/pickup`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// Mark delivery
await fetch(`/api/fleet/assignments/${assignmentId}/deliver`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🔍 Filtering by Phone Number

All location endpoints now include `driverPhone` in responses:

```javascript
// Response structure
{
  locations: [
    {
      assignmentId: 'uuid',
      driverName: 'John Doe',
      driverPhone: '1234567890',  // ← New field
      truck: { lat, lng, ... },
      order: { ... }
    }
  ]
}
```

Filter on frontend:
```javascript
const driverLocations = locations.filter(
  loc => loc.driverPhone === selectedPhone
);
```

---

## 📋 Complete Checklist

- [ ] Install `socket.io-client`
- [ ] Set up Socket.IO connection with authentication
- [ ] Create location tracking hook/component
- [ ] Integrate map library (react-leaflet)
- [ ] Add phone number filter component
- [ ] Set up notification system
- [ ] Test real-time updates
- [ ] Test notifications on status changes
- [ ] Add mobile app location tracking
- [ ] Implement start tracking endpoint
- [ ] Display warehouse and dealer locations on map
- [ ] Show ETA information
- [ ] Handle geofencing events (warehouse arrival)

---

## 📚 Full Documentation

See `DRIVER_TRACKING_FRONTEND_INTEGRATION.md` for:
- Complete component examples
- Advanced hooks and utilities
- Error handling
- Performance optimization
- Testing strategies

---

## 🆘 Common Issues

**Socket.IO not connecting?**
- Check token is valid
- Verify CORS settings
- Check network tab for errors

**Locations not updating?**
- Verify Socket.IO is connected
- Check `driverPhone` is included in events
- Ensure backend is emitting events

**Notifications not appearing?**
- Request browser notification permission
- Check Socket.IO authentication
- Verify notification service is running

