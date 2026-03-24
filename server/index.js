// ============================================
// SuckCard.com — Server Entry Point
// Express + Socket.io
// ============================================

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const setupSocketHandlers = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: isProduction
    ? {} // In production, client is served from same origin
    : {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'SuckCard.com' });
});

// In production, serve the built client files
if (isProduction) {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));

  // For any route not handled by API, serve index.html (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Setup Socket.io handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🎮 SuckCard.com Server running on port ${PORT}\n`);
});
