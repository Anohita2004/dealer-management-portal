# Frontend Authentication Fix Guide

## 🔴 Issue Identified

The backend is working correctly:
- ✅ Token is generated successfully
- ✅ OTP verification succeeds
- ✅ Response includes `token` and `user` object

**Problem:** Frontend is NOT sending the `Authorization` header in subsequent requests.

## ✅ Solution

After OTP verification, the frontend MUST:

### 1. Store the Token

```javascript
// After successful OTP verification
const response = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, otp })
});

const data = await response.json();

// ✅ STORE THE TOKEN
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

### 2. Include Token in All Requests

```javascript
// Create an API helper function
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  return fetch(`http://localhost:3000/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // ✅ THIS IS CRITICAL
      ...options.headers,
    },
  });
};

// Usage
const userData = await apiCall('/auth/me');
const users = await apiCall('/admin/users');
```

### 3. Use Axios Interceptor (Recommended)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 📋 Expected Response Format

After `/api/auth/verify-otp`, you receive:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "8e93d194-64e6-4984-8963-46647584b0cb",
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "roleId": 1,
    "regionId": null,
    "areaId": null,
    "territoryId": null,
    "dealerId": null,
    "isActive": true
  }
}
```

## 🔍 Debugging

### Check Browser Network Tab

1. Open DevTools → Network tab
2. After OTP verification, check subsequent requests
3. Look for `Authorization` header in Request Headers
4. Should see: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Check Console

```javascript
// After OTP verification
console.log('Token stored:', localStorage.getItem('token'));
console.log('User stored:', JSON.parse(localStorage.getItem('user')));
```

### Test Token Manually

```javascript
// Test if token works
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('✅ Token works:', data))
.catch(err => console.error('❌ Token failed:', err));
```

## 🎯 Quick Fix Checklist

- [ ] Token is stored in localStorage after OTP verification
- [ ] All API calls include `Authorization: Bearer <token>` header
- [ ] Using axios interceptor or fetch wrapper function
- [ ] Token is retrieved from localStorage before each request
- [ ] 401 errors redirect to login page

## 📝 Example Complete Flow

```javascript
// 1. Login (Step 1)
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const loginData = await loginResponse.json();
// Returns: { otpSent: true, userId: "...", message: "OTP sent to email" }

// 2. Verify OTP (Step 2)
const verifyResponse = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: loginData.userId, otp })
});
const { token, user } = await verifyResponse.json();

// 3. Store token
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// 4. Use token in subsequent requests
const meResponse = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}` // ✅ CRITICAL
  }
});
const meData = await meResponse.json();
```

## ⚠️ Common Mistakes

1. **Not storing token** - Token must be saved to localStorage/sessionStorage
2. **Wrong header format** - Must be `Authorization: Bearer <token>` (not just `Bearer <token>`)
3. **Token not retrieved** - Must get token from storage before each request
4. **CORS issues** - Backend is configured correctly, but ensure frontend sends credentials


