require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/error');

const authRoutes = require('./routes/auth');
const superadminRoutes = require('./routes/superadmin');
const advocateRoutes = require('./routes/advocate');
const munshiRoutes = require('./routes/munshi');

const app = express();
const PORT = process.env.PORT || 5000;

// Apply Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Ensure images can load across local client/server ports
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', message: 'Antigravity backend is fully operational.' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/advocate', advocateRoutes);
app.use('/api/munshi', munshiRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Antigravity backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
