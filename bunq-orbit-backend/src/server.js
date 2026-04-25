require('dotenv').config();
const express = require('express');
const cors = require('cors');

const bunqRoutes = require('./routes/bunq.routes');
const orbitRoutes = require('./routes/orbit.routes');
const voiceRoutes = require('./routes/voice.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Parses incoming JSON payloads

// Mount Routes
app.use('/api/bunq', bunqRoutes);
app.use('/api/orbit', orbitRoutes);
app.use('/api/orbit', voiceRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.BUNQ_ENV });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 bunq_orbit API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.BUNQ_ENV}`);
});
