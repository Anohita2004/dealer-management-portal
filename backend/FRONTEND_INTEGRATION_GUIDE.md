# Frontend Integration Guide - Complete Vision Implementation

This guide helps you build the frontend to match the complete backend implementation.

---

## 🚀 Quick Start

### 1. Environment Setup
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=http://localhost:3000
```

### 2. Authentication Flow

```javascript
// Login
const login = async (username, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

// Add token to all requests
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
};
```

### 3. Role-Based Route Guards

```javascript
// Example: React Router guard
const ProtectedRoute = ({ requiredRole, requiredPermission, children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) return <Navigate to="/login" />;
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  // Check permission via API if needed
  return children;
};

// Usage
<Route path="/admin" element={
  <ProtectedRoute requiredRole="super_admin">
    <AdminDashboard />
  </ProtectedRoute>
} />
```

---

## 📱 Page Structure by Role

### Super Admin Pages
1. **Dashboard** - `/dashboard/super`
   - Global KPIs (dealers, invoices, outstanding, approvals)
   - Region breakdown
   - Active campaigns
   - Map view (all regions)

2. **User Management** - `/admin/users`
   - Create users (all roles)
   - Assign region/area/territory/dealer
   - Assign manager
   - Assign to sales team

3. **Team Management** - `/admin/teams`
   - Create sales teams
   - Add managers to teams
   - Add dealers/staff to teams

4. **Campaign Management** - `/campaigns`
   - Create campaigns
   - Set targeting (region/territory/dealer/team/all)
   - View analytics

5. **Reports** - `/reports`
   - Global reports
   - Region-wise breakdown
   - Export capabilities

### Regional Admin Pages
1. **Dashboard** - `/dashboard/regional`
   - Region KPIs
   - Dealers in region
   - Pending approvals
   - Active campaigns

2. **User Management** - `/admin/users` (region-scoped)
   - Create users in their region only
   - Assign area/territory managers
   - Assign dealers to managers

3. **Regional Reports** - `/reports/regional`
   - Region sales
   - Region outstanding
   - Territory performance

4. **Map** - `/maps`
   - Region-only pins
   - Region heatmap
   - Region boundaries

### Manager Pages (Area/Territory/Regional Manager)
1. **Dashboard** - `/dashboard/manager`
   - Territory/area KPIs
   - Dealers under management
   - Pending approvals
   - Campaign performance

2. **Dealer Management** - `/dealers`
   - View assigned dealers only
   - Dealer performance

3. **Approvals** - `/approvals`
   - Pending orders
   - Pending invoices
   - Pending documents
   - Pending pricing

4. **Map** - `/maps`
   - Territory/area-only pins
   - Territory heatmap

### Dealer Admin Pages
1. **Dashboard** - `/dashboard/dealer`
   - Own dealer KPIs
   - Pending orders
   - Outstanding payments
   - Campaign performance

2. **Staff Management** - `/staff`
   - Create dealer staff
   - Track staff performance

3. **Orders** - `/orders`
   - View own orders
   - Approve staff orders

4. **Invoices** - `/invoices`
   - View own invoices
   - Track payments

### Dealer Staff Pages
1. **Dashboard** - `/dashboard/staff`
   - Own orders
   - Own payments
   - Pending tasks

2. **Create Order** - `/orders/create`
   - Select materials
   - Enter quantities
   - Submit for approval

3. **Payment Requests** - `/payments/create`
   - Select invoice
   - Upload proof
   - Submit for approval

---

## 🎨 UI Components Needed

### 1. Approval Workflow Component
```javascript
const ApprovalWorkflow = ({ entity, currentStage, onApprove, onReject }) => {
  const stages = {
    order: ['territory_manager', 'area_manager', 'regional_manager'],
    invoice: ['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'],
    // ... other workflows
  };
  
  const currentIndex = stages[entity.type].indexOf(currentStage);
  
  return (
    <div className="approval-timeline">
      {stages[entity.type].map((stage, idx) => (
        <div key={stage} className={idx <= currentIndex ? 'completed' : 'pending'}>
          {stage.replace('_', ' ').toUpperCase()}
        </div>
      ))}
      <button onClick={() => onApprove()}>Approve</button>
      <button onClick={() => onReject()}>Reject</button>
    </div>
  );
};
```

### 2. Scoped Data Table
```javascript
// Automatically filters based on user role
const DataTable = ({ endpoint, columns }) => {
  const [data, setData] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
  
  useEffect(() => {
    // Backend automatically scopes - no need to pass filters
    apiCall(endpoint).then(res => res.json()).then(setData);
  }, [endpoint]);
  
  // Render table...
};
```

### 3. Map Component
```javascript
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';

const DealerMap = () => {
  const [dealers, setDealers] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
  
  useEffect(() => {
    // Automatically scoped by backend
    apiCall('/maps/dealers').then(res => res.json()).then(setDealers);
  }, []);
  
  return (
    <MapContainer center={[20, 77]} zoom={5}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {dealers.map(dealer => (
        <Marker key={dealer.id} position={[dealer.lat, dealer.lng]}>
          <Popup>{dealer.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
```

### 4. Campaign Targeting Component
```javascript
const CampaignTargeting = ({ onTargetChange }) => {
  const [targets, setTargets] = useState([]);
  
  const addTarget = (type, entityId) => {
    setTargets([...targets, { type, entityId }]);
    onTargetChange([...targets, { type, entityId }]);
  };
  
  return (
    <div>
      <button onClick={() => addTarget('all', null)}>All Dealers</button>
      <RegionSelector onSelect={(id) => addTarget('region', id)} />
      <TerritorySelector onSelect={(id) => addTarget('territory', id)} />
      <DealerSelector onSelect={(id) => addTarget('dealer', id)} />
    </div>
  );
};
```

### 5. Task List Component
```javascript
const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    apiCall('/tasks').then(res => res.json()).then(data => {
      setTasks(data.tasks);
    });
  }, []);
  
  return (
    <div>
      <h2>Pending Tasks ({tasks.total})</h2>
      {tasks.byType && (
        <div>
          Orders: {tasks.byType.order} | 
          Invoices: {tasks.byType.invoice} | 
          Payments: {tasks.byType.payment}
        </div>
      )}
      {tasks.tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};
```

---

## 🔔 Real-Time Notifications Setup

```javascript
import { io } from 'socket.io-client';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(WS_URL, {
      auth: { token }
    });
    
    socket.on('authenticated', () => {
      console.log('Socket authenticated');
    });
    
    socket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    
    socket.on('order:pending:update', () => {
      // Refresh order list
    });
    
    socket.on('invoice:pending:update', () => {
      // Refresh invoice list
    });
    
    return () => socket.disconnect();
  }, []);
  
  return { notifications, unreadCount };
};
```

---

## 📊 Dashboard Data Fetching

### Super Admin Dashboard
```javascript
const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    apiCall('/reports/dashboard/super').then(res => res.json()).then(setData);
  }, []);
  
  if (!data) return <Loading />;
  
  return (
    <div>
      <KPICard title="Total Dealers" value={data.totalDealers} />
      <KPICard title="Total Invoices" value={data.totalInvoices} />
      <KPICard title="Outstanding" value={data.totalOutstanding} />
      <KPICard title="Pending Approvals" value={data.totalApprovalsPending} />
      <RegionBreakdown data={data.regions} />
    </div>
  );
};
```

### Regional Admin Dashboard
```javascript
const RegionalDashboard = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    apiCall('/reports/dashboard/regional').then(res => res.json()).then(setData);
  }, []);
  
  // Render region-scoped data
};
```

---

## 🗺️ Map Integration

### Heatmap Data
```javascript
const HeatmapLayer = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  
  useEffect(() => {
    apiCall('/maps/heatmap?granularity=region').then(res => res.json()).then(setHeatmapData);
  }, []);
  
  return (
    <HeatmapLayer
      points={heatmapData.map(d => ({
        lat: d.lat,
        lng: d.lng,
        value: d.weight
      }))}
    />
  );
};
```

### Region Boundaries
```javascript
const RegionBoundaries = () => {
  const [regions, setRegions] = useState(null);
  
  useEffect(() => {
    apiCall('/maps/regions').then(res => res.json()).then(setRegions);
  }, []);
  
  return (
    <GeoJSON data={regions} style={(feature) => ({
      fillColor: getRegionColor(feature.properties.id),
      fillOpacity: 0.5
    })} />
  );
};
```

---

## ✅ Approval Workflows UI

### Order Approval
```javascript
const OrderApprovalCard = ({ order }) => {
  const handleApprove = async () => {
    const response = await apiCall(`/orders/${order.id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' })
    });
    
    if (response.ok) {
      // Show success, refresh list
    }
  };
  
  return (
    <Card>
      <h3>{order.orderNumber}</h3>
      <p>Dealer: {order.dealer.businessName}</p>
      <p>Amount: ₹{order.totalAmount}</p>
      <p>Current Stage: {order.approvalStage}</p>
      <ApprovalWorkflow entity={order} currentStage={order.approvalStage} />
      <button onClick={handleApprove}>Approve</button>
      <button onClick={() => handleReject()}>Reject</button>
    </Card>
  );
};
```

---

## 📈 Reports & Analytics

### Campaign Analytics
```javascript
const CampaignAnalytics = ({ campaignId }) => {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    apiCall(`/campaigns/${campaignId}/analytics`).then(res => res.json()).then(setAnalytics);
  }, [campaignId]);
  
  if (!analytics) return <Loading />;
  
  return (
    <div>
      <h2>{analytics.campaignName}</h2>
      <div>
        <p>Participation: {analytics.participation.participated} / {analytics.participation.totalTargeted}</p>
        <p>Participation Rate: {analytics.participation.participationRate}%</p>
        <p>Total Revenue: ₹{analytics.revenue.total}</p>
        <p>Attributed Revenue: ₹{analytics.revenue.attributed}</p>
      </div>
      <Chart data={analytics} />
    </div>
  );
};
```

---

## 🎯 Feature Toggle Integration

```javascript
const useFeatureToggle = (key) => {
  const [enabled, setEnabled] = useState(true);
  
  useEffect(() => {
    apiCall(`/feature-toggles/${key}`).then(res => res.json()).then(toggle => {
      setEnabled(toggle.isEnabled);
    });
  }, [key]);
  
  return enabled;
};

// Usage
const PricingApprovals = () => {
  const pricingEnabled = useFeatureToggle('pricing_approvals');
  
  if (!pricingEnabled) {
    return <div>Pricing approvals are currently disabled</div>;
  }
  
  return <PricingApprovalUI />;
};
```

---

## 📝 Form Examples

### Create User (Super Admin)
```javascript
const CreateUserForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    roleId: null,
    regionId: null,
    areaId: null,
    territoryId: null,
    dealerId: null,
    managerId: null,
    salesGroupId: null
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await apiCall('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      // Show success, redirect
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={formData.username} onChange={...} />
      <RoleSelector value={formData.roleId} onChange={...} />
      <RegionSelector value={formData.regionId} onChange={...} />
      {/* Conditional fields based on role */}
      {formData.roleId === 'dealer_admin' && (
        <DealerSelector value={formData.dealerId} onChange={...} />
      )}
      <button type="submit">Create User</button>
    </form>
  );
};
```

### Create Campaign with Targeting
```javascript
const CreateCampaignForm = () => {
  const [targetAudience, setTargetAudience] = useState([]);
  
  const handleSubmit = async (formData) => {
    const response = await apiCall('/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        targetAudience
      })
    });
  };
  
  return (
    <form>
      <CampaignTargeting onTargetChange={setTargetAudience} />
      {/* Other fields */}
    </form>
  );
};
```

---

## 🔍 Error Handling

```javascript
const useApiCall = () => {
  const handleError = async (response) => {
    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (response.status === 403) {
      // Permission denied
      showNotification('You do not have permission to perform this action', 'error');
    } else if (response.status === 404) {
      showNotification('Resource not found', 'error');
    } else {
      const error = await response.json();
      showNotification(error.error || 'An error occurred', 'error');
    }
  };
  
  return { handleError };
};
```

---

## 📦 State Management Recommendations

### Context for User & Auth
```javascript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  useEffect(() => {
    if (token) {
      // Validate token, fetch user details
    }
  }, [token]);
  
  return (
    <AuthContext.Provider value={{ user, token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Context for Notifications
```javascript
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Socket.IO setup here
  
  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

---

## 🎨 UI/UX Recommendations

1. **Role-Based Navigation**
   - Show/hide menu items based on user role
   - Use permissions to enable/disable features

2. **Approval Indicators**
   - Show approval stage progress bar
   - Highlight overdue items (SLA)
   - Color-code by status (pending/approved/rejected)

3. **Scoped Data Indicators**
   - Show "Viewing: Region X" or "Viewing: Territory Y"
   - Allow super admin to switch scope

4. **Real-Time Updates**
   - Show notification badge
   - Auto-refresh lists when Socket.IO events received
   - Show "New" badges on updated items

5. **Map Features**
   - Cluster markers for many dealers
   - Heatmap overlay toggle
   - Filter by date range
   - Click dealer pin → show details

6. **Dashboard Widgets**
   - Draggable/reorderable widgets
   - Date range filters
   - Export to PDF/Excel

---

## 🧪 Testing Checklist

- [ ] Login/Logout flow
- [ ] Role-based route access
- [ ] Permission-based feature access
- [ ] Scoped data (managers see only their territory)
- [ ] Multi-stage approval workflows
- [ ] Real-time notifications
- [ ] Map rendering with scoped pins
- [ ] Campaign targeting
- [ ] File uploads (documents, payment proofs)
- [ ] PDF generation/download
- [ ] Excel/PDF exports
- [ ] Feature toggle behavior
- [ ] Task list updates
- [ ] SLA indicators

---

## 📚 Additional Resources

- **Backend API Docs:** See `API_DOCUMENTATION.md`
- **Socket.IO Docs:** https://socket.io/docs/v4/
- **React Router:** https://reactrouter.com/
- **Leaflet Maps:** https://react-leaflet.js.org/

---

**Ready to build!** The backend is fully implemented and ready for frontend integration. All endpoints are secured, scoped, and tested.

