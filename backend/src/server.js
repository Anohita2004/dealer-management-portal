const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { syncDatabase, sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const documentRoutes = require('./routes/documentRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const reportRoutes = require('./routes/reportRoutes');
const sapRoutes = require('./routes/sapRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const messageRoutes = require('./routes/messageRoutes');
const accountsRoutes = require("./routes/accountsRoutes");
const pricingRoutes = require('./routes/pricingRoutes');




 // ✅ correct path only once

const app = express();
const PORT = process.env.PORT || 3000;

// 🔒 Security and Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// 🩺 Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 🧩 Routes
app.use('/api/auth', authRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sap', sapRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/messages', messageRoutes); 
app.use("/api/accounts", accountsRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);
app.use('/api/pricing', pricingRoutes);
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

 // /pricing/request and /pricing/
// ✅ keep only this one

// 🧨 Error Handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ❌ Route Not Found
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 🚀 Start Server with Socket.IO
const http = require('http');
const { Server } = require('socket.io');

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    await syncDatabase();

    // Create HTTP server and wrap Express app
    const server = http.createServer(app);

    // 🔌 Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PATCH'],
        credentials: true
      }
    });

    // ✅ Make io available inside controllers
    app.set('io', io);

    // 🔐 Handle connections
    io.on('connection', (socket) => {
      console.log(`⚡ User connected: ${socket.id}`);

      // When frontend authenticates, join rooms based on user and role
      socket.on('authenticate', ({ userId, role }) => {
        if (userId) socket.join(`user:${userId}`);
        if (role) socket.join(`role:${role}`);
        console.log(`✅ Socket joined rooms: user:${userId}, role:${role}`);
      });

      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
      });
    });

    // Start HTTP + Socket.IO server
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
      console.log(`🌍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;



