# Driver Location Tracking & Notifications - Frontend Integration Guide

This guide provides step-by-step instructions for integrating driver location tracking (by phone number) and real-time notifications into your frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Socket.IO Setup](#socketio-setup)
3. [Location Tracking Components](#location-tracking-components)
4. [Map Integration with Phone Number Filtering](#map-integration-with-phone-number-filtering)
5. [Notification System](#notification-system)
6. [Complete Example Components](#complete-example-components)
7. [Mobile App Integration](#mobile-app-integration)

---

## Overview

### Key Features
- **Real-time location tracking** based on driver phone number
- **Live map updates** showing truck locations
- **Automatic notifications** to admins when drivers update order status
- **Socket.IO integration** for real-time updates
- **Phone number-based filtering** for map display

### Flow Diagram
```
Driver Mobile App → Updates Location → Backend → Socket.IO → Frontend Map
                                                      ↓
                                              Admin Dashboard
                                              (Real-time Updates)
```

---

## Socket.IO Setup

### 1. Install Dependencies

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

### 2. Create Socket.IO Service

Create `src/services/socketService.js`:

```javascript
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket.id);
      this.isConnected = true;
      
      // Authenticate with token
      this.socket.emit('authenticate', { token });
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    // Join order tracking room if needed
    this.joinOrderRoom = (orderId) => {
      if (this.socket?.connected) {
        this.socket.emit('join_order_tracking', { orderId });
      }
    };

    // Leave order tracking room
    this.leaveOrderRoom = (orderId) => {
      if (this.socket?.connected) {
        this.socket.emit('leave_order_tracking', { orderId });
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Subscribe to location updates
  onLocationUpdate(callback) {
    if (!this.socket) return;

    this.socket.on('truck:location:update', (data) => {
      callback(data);
    });
  }

  // Subscribe to order tracking updates
  onOrderTrackingUpdate(callback) {
    if (!this.socket) return;

    this.socket.on('order:tracking:update', (data) => {
      callback(data);
    });
  }

  // Subscribe to tracking started events
  onTrackingStarted(callback) {
    if (!this.socket) return;

    this.socket.on('order:tracking:started', (data) => {
      callback(data);
    });
  }

  // Subscribe to truck status changes
  onTruckStatusChange(callback) {
    if (!this.socket) return;

    this.socket.on('truck:status:change', (data) => {
      callback(data);
    });
  }

  // Subscribe to notifications
  onNotification(callback) {
    if (!this.socket) return;

    this.socket.on('notification', (data) => {
      callback(data);
    });
  }

  // Remove all listeners
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
  }
}

export default new SocketService();
```

---

## Location Tracking Components

### 1. Live Locations Hook

Create `src/hooks/useLiveLocations.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import api from '../services/api'; // Your API service

export const useLiveLocations = (driverPhone = null) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial locations
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/tracking/live');
      let fetchedLocations = response.data.locations || [];

      // Filter by phone number if provided
      if (driverPhone) {
        fetchedLocations = fetchedLocations.filter(
          loc => loc.driverPhone === driverPhone
        );
      }

      setLocations(fetchedLocations);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch live locations:', err);
    } finally {
      setLoading(false);
    }
  }, [driverPhone]);

  // Initial fetch
  useEffect(() => {
    fetchLocations();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  // Listen to real-time updates
  useEffect(() => {
    const handleLocationUpdate = (data) => {
      setLocations(prev => {
        // Filter by phone number if specified
        if (driverPhone && data.driverPhone !== driverPhone) {
          return prev;
        }

        // Update or add location
        const existingIndex = prev.findIndex(
          loc => loc.assignmentId === data.assignmentId
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            truck: {
              ...updated[existingIndex].truck,
              lat: data.lat,
              lng: data.lng,
              lastUpdate: data.timestamp
            }
          };
          return updated;
        } else {
          // New location - fetch full details
          fetchLocations();
          return prev;
        }
      });
    };

    socketService.onLocationUpdate(handleLocationUpdate);

    return () => {
      socketService.removeAllListeners('truck:location:update');
    };
  }, [driverPhone, fetchLocations]);

  return { locations, loading, error, refetch: fetchLocations };
};
```

### 2. Order Tracking Hook

Create `src/hooks/useOrderTracking.js`:

```javascript
import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import api from '../services/api';

export const useOrderTracking = (orderId) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchTracking = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tracking/order/${orderId}`);
        setTracking(response.data);
        setError(null);

        // Join order tracking room
        socketService.joinOrderRoom(orderId);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch order tracking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();

    // Listen to real-time updates
    const handleUpdate = (data) => {
      if (data.orderId === orderId) {
        setTracking(prev => ({
          ...prev,
          assignment: {
            ...prev.assignment,
            ...data.assignment
          },
          currentLocation: data.currentLocation
        }));
      }
    };

    socketService.onOrderTrackingUpdate(handleUpdate);
    socketService.onTrackingStarted(handleUpdate);

    return () => {
      socketService.leaveOrderRoom(orderId);
      socketService.removeAllListeners('order:tracking:update');
      socketService.removeAllListeners('order:tracking:started');
    };
  }, [orderId]);

  return { tracking, loading, error };
};
```

---

## Map Integration with Phone Number Filtering

### 1. Truck Location Map Component

Create `src/components/TruckLocationMap.jsx`:

```javascript
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useLiveLocations } from '../hooks/useLiveLocations';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const TruckLocationMap = ({ driverPhone = null, center = [20.5937, 78.9629], zoom = 5 }) => {
  const { locations, loading, error } = useLiveLocations(driverPhone);
  const mapRef = useRef(null);

  // Filter locations by phone number if provided
  const filteredLocations = driverPhone
    ? locations.filter(loc => loc.driverPhone === driverPhone)
    : locations;

  // Update map bounds when locations change
  useEffect(() => {
    if (mapRef.current && filteredLocations.length > 0) {
      const map = mapRef.current;
      const bounds = L.latLngBounds(
        filteredLocations
          .filter(loc => loc.truck?.lat && loc.truck?.lng)
          .map(loc => [loc.truck.lat, loc.truck.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredLocations]);

  if (loading) {
    return <div className="p-4">Loading locations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        whenCreated={mapInstance => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Warehouse markers */}
        {filteredLocations.map(location => {
          if (!location.warehouse?.lat || !location.warehouse?.lng) return null;
          
          return (
            <Marker
              key={`warehouse-${location.assignmentId}`}
              position={[location.warehouse.lat, location.warehouse.lng]}
            >
              <Popup>
                <div>
                  <strong>Warehouse:</strong> {location.warehouse.name}
                  <br />
                  <strong>Order:</strong> {location.orderNumber}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Truck markers with phone number info */}
        {filteredLocations
          .filter(loc => loc.truck?.lat && loc.truck?.lng)
          .map(location => (
            <Marker
              key={`truck-${location.assignmentId}`}
              position={[location.truck.lat, location.truck.lng]}
              icon={truckIcon}
            >
              <Popup>
                <div>
                  <strong>Truck:</strong> {location.truck.truckName}
                  <br />
                  <strong>License:</strong> {location.truck.licenseNumber}
                  <br />
                  <strong>Driver:</strong> {location.driverName}
                  <br />
                  <strong>Phone:</strong> {location.driverPhone || 'N/A'}
                  <br />
                  <strong>Order:</strong> {location.orderNumber}
                  <br />
                  <strong>Status:</strong> {location.status}
                  <br />
                  <strong>Last Update:</strong>{' '}
                  {location.truck.lastUpdate
                    ? new Date(location.truck.lastUpdate).toLocaleString()
                    : 'N/A'}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Route line from warehouse to truck */}
        {filteredLocations
          .filter(
            loc =>
              loc.warehouse?.lat &&
              loc.warehouse?.lng &&
              loc.truck?.lat &&
              loc.truck?.lng
          )
          .map(location => (
            <Polyline
              key={`route-${location.assignmentId}`}
              positions={[
                [location.warehouse.lat, location.warehouse.lng],
                [location.truck.lat, location.truck.lng]
              ]}
              color="blue"
              dashArray="5, 10"
            />
          ))}
      </MapContainer>

      {/* Location list sidebar */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded shadow-lg max-h-96 overflow-y-auto">
        <h3 className="font-bold mb-2">
          Active Trucks {driverPhone && `(${driverPhone})`}
        </h3>
        {filteredLocations.length === 0 ? (
          <p className="text-gray-500">No active trucks</p>
        ) : (
          <ul className="space-y-2">
            {filteredLocations.map(location => (
              <li key={location.assignmentId} className="border-b pb-2">
                <div className="text-sm">
                  <strong>{location.truck?.truckName}</strong>
                  <br />
                  Driver: {location.driverName} ({location.driverPhone})
                  <br />
                  Order: {location.orderNumber}
                  <br />
                  Status: <span className="text-blue-600">{location.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TruckLocationMap;
```

### 2. Driver Filter Component

Create `src/components/DriverFilter.jsx`:

```javascript
import React, { useState } from 'react';

const DriverFilter = ({ onFilterChange, currentPhone = null }) => {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilterChange(phoneNumber || null);
  };

  const handleClear = () => {
    setPhoneNumber('');
    onFilterChange(null);
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="tel"
          placeholder="Filter by driver phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Filter
        </button>
        {phoneNumber && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        )}
      </form>
      {currentPhone && (
        <p className="mt-2 text-sm text-gray-600">
          Showing locations for: <strong>{currentPhone}</strong>
        </p>
      )}
    </div>
  );
};

export default DriverFilter;
```

---

## Notification System

### 1. Notification Hook

Create `src/hooks/useNotifications.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import api from '../services/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications?limit=50');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time notifications
    const handleNotification = (data) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.message,
          icon: '/icon-192x192.png'
        });
      }
    };

    socketService.onNotification(handleNotification);

    return () => {
      socketService.removeAllListeners('notification');
    };
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
};
```

### 2. Notification Component

Create `src/components/NotificationBell.jsx`:

```javascript
import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  // Request notification permission
  const requestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          requestPermission();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 text-xs text-white bg-red-500 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{notification.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                      {notification.priority === 'high' && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
```

---

## Complete Example Components

### Main Dashboard Component

Create `src/pages/FleetTrackingDashboard.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { MapContainer } from 'react-leaflet';
import TruckLocationMap from '../components/TruckLocationMap';
import DriverFilter from '../components/DriverFilter';
import NotificationBell from '../components/NotificationBell';
import socketService from '../services/socketService';
import { useAuth } from '../contexts/AuthContext'; // Your auth context

const FleetTrackingDashboard = () => {
  const { user, token } = useAuth();
  const [selectedDriverPhone, setSelectedDriverPhone] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO when component mounts
    if (token) {
      socketService.connect(token);
    }

    return () => {
      // Disconnect when component unmounts
      socketService.disconnect();
    };
  }, [token]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fleet Tracking Dashboard</h1>
        <NotificationBell />
      </header>

      {/* Filter Section */}
      <div className="p-4 bg-gray-50">
        <DriverFilter
          currentPhone={selectedDriverPhone}
          onFilterChange={setSelectedDriverPhone}
        />
      </div>

      {/* Map Section */}
      <div className="flex-1">
        <TruckLocationMap driverPhone={selectedDriverPhone} />
      </div>
    </div>
  );
};

export default FleetTrackingDashboard;
```

---

## Mobile App Integration

### React Native Example

For mobile apps (React Native), use the following:

```javascript
// MobileAppLocationTracker.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import * as Location from 'expo-location';
import api from './services/api';
import socketService from './services/socketService';

const MobileAppLocationTracker = ({ assignmentId, truckId, token }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO
    if (token) {
      socketService.connect(token);
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      socketService.disconnect();
    };
  }, [token]);

  const startTracking = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      // Start location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update every 50 meters
        },
        async (location) => {
          // Send location to backend
          try {
            await api.post('/tracking/location', {
              truckId,
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              speed: location.coords.speed,
              heading: location.coords.heading,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Failed to send location:', error);
          }
        }
      );

      setLocationSubscription(subscription);
      setIsTracking(true);
    } catch (error) {
      console.error('Failed to start tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setIsTracking(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Location Tracking</Text>
      {!isTracking ? (
        <Button title="Start Tracking" onPress={startTracking} />
      ) : (
        <Button title="Stop Tracking" onPress={stopTracking} />
      )}
    </View>
  );
};

export default MobileAppLocationTracker;
```

---

## API Integration Examples

### Update Location (Mobile App)

```javascript
// Update truck location
const updateLocation = async (truckId, lat, lng, speed, heading) => {
  try {
    const response = await api.post('/tracking/location', {
      truckId,
      lat,
      lng,
      speed: speed || null,
      heading: heading || null,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update location:', error);
    throw error;
  }
};
```

### Get Live Locations

```javascript
// Get all active truck locations
const getLiveLocations = async (driverPhone = null) => {
  try {
    const response = await api.get('/tracking/live');
    let locations = response.data.locations || [];
    
    // Filter by phone number if provided
    if (driverPhone) {
      locations = locations.filter(loc => loc.driverPhone === driverPhone);
    }
    
    return locations;
  } catch (error) {
    console.error('Failed to get live locations:', error);
    throw error;
  }
};
```

### Mark Pickup/Delivery

```javascript
// Mark pickup
const markPickup = async (assignmentId) => {
  try {
    const response = await api.post(`/fleet/assignments/${assignmentId}/pickup`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark pickup:', error);
    throw error;
  }
};

// Mark delivery
const markDelivered = async (assignmentId) => {
  try {
    const response = await api.post(`/fleet/assignments/${assignmentId}/deliver`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark delivery:', error);
    throw error;
  }
};
```

---

## Environment Variables

Add to your `.env` file:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

---

## Installation Summary

1. **Install dependencies:**
   ```bash
   npm install socket.io-client react-leaflet leaflet
   npm install -D @types/leaflet
   ```

2. **Set up Socket.IO service** (see above)

3. **Create hooks** for location tracking and notifications

4. **Create map components** with phone number filtering

5. **Integrate notification system** with real-time updates

6. **Connect everything** in your main dashboard component

---

## Testing

1. **Test location updates:**
   - Use mobile app to send location updates
   - Verify they appear on the map in real-time
   - Check that filtering by phone number works

2. **Test notifications:**
   - Mark pickup/delivery as a driver
   - Verify admins receive notifications
   - Check that notifications appear in real-time

3. **Test Socket.IO:**
   - Open browser console
   - Verify connection messages
   - Check that events are received

---

## Troubleshooting

### Socket.IO not connecting
- Check that token is valid
- Verify CORS settings on backend
- Check network tab for connection errors

### Locations not updating
- Verify Socket.IO is connected
- Check that location updates include `driverPhone`
- Ensure backend is emitting events correctly

### Notifications not appearing
- Check notification permissions in browser
- Verify Socket.IO authentication
- Check backend notification service logs

---

## Next Steps

1. Add location history visualization
2. Add route optimization
3. Add ETA calculations
4. Add driver performance metrics
5. Add geofencing alerts

