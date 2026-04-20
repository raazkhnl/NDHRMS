require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const nidRoutes = require('./routes/nid');
const examRegisterRoutes = require('./routes/examRegister');
const postsRoutes = require('./routes/posts');
const applicationRoutes = require('./routes/application');
const resultsRoutes = require('./routes/results');
const adminAuthRoutes = require('./routes/adminAuth');
const ministryRoutes = require('./routes/ministry');
const pscAdminRoutes = require('./routes/pscAdmin');
const grievancesRoutes = require('./routes/grievances');
const meritListRoutes = require('./routes/meritList');
const priorityRoutes = require('./routes/priority');
const placementRoutes = require('./routes/placement');
const officerRoutes = require('./routes/officer');
const tenureRoutes = require('./routes/tenure');
const transferScoreRoutes = require('./routes/transferScore');
const appraisalsRoutes = require('./routes/appraisals');
const exemptionsRoutes = require('./routes/exemptions');
const transferWindowRoutes = require('./routes/transferWindow');
const auditRoutes = require('./routes/audit');
const antiGamingRoutes = require('./routes/antiGaming');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ───────────────────────────────────────────────────────────────────
// Supports a comma-separated list in CLIENT_ORIGIN for multiple origins.
// e.g. CLIENT_ORIGIN=https://ndhrms.vercel.app,http://localhost:5173
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'NDHRMS — Nepal Digital HR Management System API',
    status: 'running',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/nid',
      '/api/exam-register',
      '/api/posts',
      '/api/application',
      '/api/results',
      '/api/admin-auth',
      '/api/ministry',
      '/api/psc-admin',
      '/api/grievances',
      '/api/merit-list',
      '/api/priority',
      '/api/placement',
      '/api/officer',
      '/api/tenure',
      '/api/score',
      '/api/appraisals',
      '/api/exemptions',
      '/api/transfer-window',
      '/api/audit',
      '/api/anti-gaming'
    ]
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/nid', nidRoutes);
app.use('/api/exam-register', examRegisterRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/ministry', ministryRoutes);
app.use('/api/psc-admin', pscAdminRoutes);
app.use('/api/grievances', grievancesRoutes);
app.use('/api/merit-list', meritListRoutes);
app.use('/api/priority', priorityRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/tenure', tenureRoutes);
app.use('/api/score', transferScoreRoutes);
app.use('/api/appraisals', appraisalsRoutes);
app.use('/api/exemptions', exemptionsRoutes);
app.use('/api/transfer-window', transferWindowRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/anti-gaming', antiGamingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── MongoDB connection ──────────────────────────────────────────────────────
// Vercel serverless: on each cold start, connect if not already connected.
// Local dev (require.main === module): also start the HTTP server.
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log('✅ MongoDB connected');
};

// Wrap app so Vercel can call connectDB on every invocation
const handler = async (req, res) => {
  await connectDB();
  app(req, res);
};

// Export for Vercel serverless
module.exports = handler;

// Local dev: start the HTTP listener directly
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 NDHRMS Server running on http://localhost:${PORT}`);
        console.log(`📋 API Docs: http://localhost:${PORT}/`);
      });
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('   Check your MONGODB_URI in server/.env');
      process.exit(1);
    });
}
