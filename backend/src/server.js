// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { sequelize } = require('./models');

// --- Import routes (keep the same as your repo) ---
const authRoutes = require('./routes/authRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const documentRoutes = require('./routes/documentRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const reportRoutes = require('./routes/reportRoutes');
const sapRoutes = require('./routes/sapRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const messageRoutes = require('./routes/messageRoutes');
const accountsRoutes = require('./routes/accountsRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const managerRoutes = require('./routes/managerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const rolesRoutes = require('./routes/roles');
const permissionsRoutes = require('./routes/permissions');
const regionRoutes = require('./routes/regionRoutes');
const materialRoutes = require('./routes/materialRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes'); // new chat endpoints
const areaRoutes = require('./routes/areaRoutes');
const territoryRoutes = require('./routes/territoryRoutes');
const teamRoutes = require('./routes/teamRoutes');
const featureToggleRoutes = require('./routes/featureToggleRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const truckRoutes = require('./routes/truckRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const trackingRoutes = require('./routes/trackingRoutes');

// --- Express app setup ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
  })
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// basic health
app.get('/health', (req, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
);
const mapsRouter = require('./routes/maps');
app.use('/api/maps', mapsRouter);


// --- Register routes (order preserved) ---
app.use('/api/auth', authRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sap', sapRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
// Region CRUD + dashboards, mounted under /api/regions
app.use('/api/regions', regionRoutes);
app.use('/api/materials', materialRoutes);

app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes); // role-filtered chat REST endpoints
app.use('/api/areas', areaRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/feature-toggles', featureToggleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/tracking', trackingRoutes);

// --- Error handling (keep your behavior) ---
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- SERVER + SOCKET.IO SETUP ---
// Create HTTP server (wrap express)
const server = http.createServer(app);

// Configure Socket.IO with CORS and path
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
  // optional: path: '/socket.io' (default)
});

// expose io & models to controllers
app.set('io', io);
app.set('models', require('./models'));
// Make io globally available for services
global.io = io;

// Scheduled SLA job - runs every hour
const runSLAJob = async () => {
  try {
    const { checkSLA } = require('./utils/sla');
    await checkSLA();
    console.log('✅ SLA check completed at', new Date().toISOString());
  } catch (error) {
    console.error('❌ SLA job error:', error);
    console.error('❌ SLA job error stack:', error.stack);
    // Don't crash the server if SLA job fails
  }
};

// Run immediately on startup, then every hour (only if enabled)
if (process.env.ENABLE_SLA_JOB !== 'false') {
  // Run SLA job asynchronously after server starts to avoid blocking startup
  setTimeout(() => {
    runSLAJob();
    setInterval(runSLAJob, 60 * 60 * 1000); // Every hour
    console.log('✅ Scheduled SLA job enabled (runs every hour)');
  }, 2000); // Wait 2 seconds after server starts
}

// Helper: deterministic room id for 1-1 chats
const createRoomId = (a, b) => `chat:${[String(a), String(b)].sort().join('-')}`;

// --- Socket authentication helper ---
// Validates JWT presented in handshake.auth.token and attaches decoded user
const verifySocketToken = (token) => {
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret);
    return decoded; // should include user id and role (based on your token payload)
  } catch (err) {
    console.warn('Socket JWT verify failed:', err && err.message);
    return null;
  }
};

// --- Socket.io connection handler ---
io.use((socket, next) => {
  // Accept connection, we'll require explicit authenticate or use token in handshake
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (token) {
    const decoded = verifySocketToken(token);
    if (!decoded) return next(); // allow connection but no user attached; client must call authenticate
    // attach to socket for easier reference
    socket.user = decoded;
  }
  return next();
});

io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id, socket.user ? `user:${socket.user.id}` : '');

  // If client explicitly emits authenticate (safer, for cases where token is not in handshake)
  socket.on('authenticate', (payload = {}) => {
    try {
      // prefer handshake-decoded token if present
      if (socket.user && socket.user.id) {
        const u = socket.user;
        socket.join(`user:${u.id}`);
        if (u.role) socket.join(`role:${u.role}`);
        socket.emit('authenticated', { ok: true, user: u });
        console.log(`🔐 socket ${socket.id} authenticated via token user:${u.id}`);
        return;
      }

      // if payload contains token, verify it
      if (payload.token) {
        const decoded = verifySocketToken(payload.token);
        if (decoded && decoded.id) {
          socket.user = decoded;
          socket.join(`user:${decoded.id}`);
          if (decoded.role) socket.join(`role:${decoded.role}`);
          socket.emit('authenticated', { ok: true, user: decoded });
          console.log(`🔐 socket ${socket.id} authenticated via payload token user:${decoded.id}`);
          return;
        }
      }

      // fallback: accept userId/role direct join (less secure, use only for dev)
      const { userId, role } = payload;
      if (userId) socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
      socket.emit('authenticated', { ok: true, user: { id: userId, role } });
      console.log(`🔐 socket ${socket.id} joined user:${userId} role:${role} (no-token fallback)`);
    } catch (err) {
      console.warn('authenticate handler error', err);
    }
  });

  // Join a one-to-one chat room
  socket.on('join_chat', ({ user1, user2 }) => {
    try {
      const room = createRoomId(user1, user2);
      socket.join(room);
      // optional: emit back current participants or ack
      socket.emit('joined_room', { room });
      console.log(`🔗 socket ${socket.id} joined room ${room}`);
    } catch (err) {
      console.warn('join_chat error', err);
    }
  });

  // Leave a chat room
  socket.on('leave_chat', ({ user1, user2 }) => {
    try {
      const room = createRoomId(user1, user2);
      socket.leave(room);
      socket.emit('left_room', { room });
    } catch (err) {
      console.warn('leave_chat error', err);
    }
  });

  // Typing indicator
  socket.on('typing', ({ user1, user2, isTyping }) => {
    try {
      const room = createRoomId(user1, user2);
      socket.to(room).emit('typing', { userId: user1, isTyping });
    } catch (err) {
      console.warn('typing error', err);
    }
  });

  // Handle incoming chat message from client
  socket.on('send_message', async (payload) => {
    try {
      const { senderId, recipientId, body, subject = '' } = payload || {};
      if (!senderId || !recipientId || !body) {
        socket.emit('message_error', { error: 'missing_required_fields' });
        return;
      }

      // Check permissions using chat controller
      const { getAllowedUsersInternal } = require('./controllers/chatController');
      const { User, Role } = require('./models');
      
      const sender = await User.findByPk(senderId, {
        include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name'] }]
      });
      
      if (!sender) {
        socket.emit('message_error', { error: 'sender_not_found' });
        return;
      }

      // Check if sender is allowed to message recipient
      const allowedUsers = await getAllowedUsersInternal(sender);
      const isAllowed = allowedUsers.some(u => String(u.id) === String(recipientId));
      
      if (!isAllowed) {
        socket.emit('message_error', { error: 'not_allowed_to_message_user' });
        return;
      }

      const { Message } = require('./models'); // load models dynamically to avoid cycles
      const saved = await Message.create({
        senderId,
        recipientId,
        subject,
        body,
        status: 'unread',
        messageType: 'chat',
      });

      const room = createRoomId(senderId, recipientId);

      // Broadcast to the room (both participants)
      io.to(room).emit('receive_message', {
        id: saved.id,
        senderId: saved.senderId,
        recipientId: saved.recipientId,
        body: saved.body,
        subject: saved.subject,
        createdAt: saved.createdAt,
        status: saved.status,
      });

      // Send personal notification to recipient's user room
      io.to(`user:${recipientId}`).emit('new_message_notification', {
        from: senderId,
        preview: saved.body.slice(0, 120),
        messageId: saved.id,
      });

      // Optionally: emit ack to sender with saved id
      socket.emit('message_sent', { success: true, id: saved.id, createdAt: saved.createdAt });
      console.log(`💬 message saved and broadcasted (id=${saved.id})`);
    } catch (err) {
      console.error('send_message error:', err);
      socket.emit('message_error', { error: 'failed_to_send' });
    }
  });

  // Join truck tracking room
  socket.on('track_truck', ({ truckId }) => {
    try {
      if (truckId) {
        socket.join(`truck:${truckId}`);
        socket.emit('tracking_started', { truckId });
        console.log(`🚚 socket ${socket.id} tracking truck:${truckId}`);
      }
    } catch (err) {
      console.warn('track_truck error', err);
    }
  });

  // Leave truck tracking room
  socket.on('untrack_truck', ({ truckId }) => {
    try {
      if (truckId) {
        socket.leave(`truck:${truckId}`);
        socket.emit('tracking_stopped', { truckId });
      }
    } catch (err) {
      console.warn('untrack_truck error', err);
    }
  });

  // Join order tracking room
  socket.on('track_order', ({ orderId }) => {
    try {
      if (orderId) {
        socket.join(`order:${orderId}`);
        socket.emit('order_tracking_started', { orderId });
        console.log(`📦 socket ${socket.id} tracking order:${orderId}`);
      }
    } catch (err) {
      console.warn('track_order error', err);
    }
  });

  // Leave order tracking room
  socket.on('untrack_order', ({ orderId }) => {
    try {
      if (orderId) {
        socket.leave(`order:${orderId}`);
        socket.emit('order_tracking_stopped', { orderId });
      }
    } catch (err) {
      console.warn('untrack_order error', err);
    }
  });

  // Join fleet region/area rooms for managers
  socket.on('join_fleet_scope', ({ regionId, areaId }) => {
    try {
      if (regionId) {
        socket.join(`fleet:region:${regionId}`);
        console.log(`🌍 socket ${socket.id} joined fleet region:${regionId}`);
      }
      if (areaId) {
        socket.join(`fleet:area:${areaId}`);
        console.log(`📍 socket ${socket.id} joined fleet area:${areaId}`);
      }
    } catch (err) {
      console.warn('join_fleet_scope error', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
  });
});

// --- Start server bootstrap (DB connect + sync + listen) ---
const startServer = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');

    // Note: syncDatabase was removed - using migrations instead
    // Database tables should be created via migrations

    console.log('🔄 Starting server...');
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
      console.log(`🌍 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API base URL: http://localhost:${PORT}/api`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('❌ Error message:', err.message);
    console.error('❌ Error stack:', err.stack);
    process.exit(1);
  }
};

startServer();

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received: shutting down');
  try {
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
});

module.exports = app;
