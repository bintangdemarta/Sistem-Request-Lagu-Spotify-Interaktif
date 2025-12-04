const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

(async () => {
  await redisClient.connect();
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_to_a_long_random_string',
  resave: false,
  saveUninitialized: true
}));

// In-memory storage for our fair queuing system
const userQueues = new Map(); // user_id -> [track_uri, ...]
const activeUsers = []; // List for round-robin rotation
let currentTrack = null;
let isPlaying = false;

// Log user visit to the website
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);
  const userAgent = req.get('User-Agent') || 'Unknown';

  // Log visit in Redis
  const logEntry = {
    timestamp: timestamp,
    ip: ip,
    userAgent: userAgent,
    path: req.path,
    method: req.method
  };

  // Add to Redis list for visit logs
  redisClient.lPush('visit_logs', JSON.stringify(logEntry));

  // Also keep a capped list (last 1000 visits)
  redisClient.lTrim('visit_logs', 0, 999);

  // Increment daily visitor count
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  redisClient.hIncrBy('daily_visitors', today, 1);

  next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join session
  socket.on('join_session', async (data) => {
    const userId = socket.id;
    const username = data.username;
    const timestamp = new Date().toISOString();

    // Store user info in Redis
    await redisClient.hSet(`user_sessions:${userId}`, {
      id: userId,
      username: username,
      connectedAt: timestamp
    });

    // Log user join event in Redis
    const joinLogEntry = {
      event: 'user_join',
      userId: userId,
      username: username,
      timestamp: timestamp,
      ip: socket.handshake.headers['x-forwarded-for'] ||
          socket.handshake.address || 'unknown'
    };

    // Add to Redis list for join logs
    await redisClient.lPush('join_logs', JSON.stringify(joinLogEntry));
    await redisClient.lTrim('join_logs', 0, 999); // Keep only last 1000 entries

    // Add to active users
    if (!activeUsers.includes(userId)) {
      activeUsers.push(userId);
    }

    socket.join('jukebox');
    socket.emit('session_joined', { userId, username });
    io.to('jukebox').emit('queue_updated', { queues: await getQueueStatus() });
  });

  // Add song to user's queue
  socket.on('add_song', async (data) => {
    const userId = socket.id;
    const trackUri = data.trackUri;
    const timestamp = new Date().toISOString();

    // Get user info for logging
    const userInfo = await redisClient.hGetAll(`user_sessions:${userId}`);

    // Log the song addition
    const songLogEntry = {
      event: 'add_song',
      userId: userId,
      username: userInfo.username || 'unknown',
      trackUri: trackUri,
      timestamp: timestamp
    };

    // Add to Redis list for song logs
    await redisClient.lPush('song_logs', JSON.stringify(songLogEntry));
    await redisClient.lTrim('song_logs', 0, 999); // Keep only last 1000 entries

    // Add to user's personal queue in Redis
    await redisClient.lPush(`queue:${userId}`, trackUri);

    // Emit updated queue to all clients
    io.to('jukebox').emit('queue_updated', { queues: await getQueueStatus() });
  });

  // Handle player sync
  socket.on('sync_player', (data) => {
    currentTrack = data.track;
    isPlaying = data.isPlaying;
    io.to('jukebox').emit('now_playing', {
      track: currentTrack,
      isPlaying: isPlaying,
      position: data.position
    });
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    // Get user info before removing
    const userInfo = await redisClient.hGetAll(`user_sessions:${socket.id}`);

    // Log user disconnect event
    const disconnectLogEntry = {
      event: 'user_disconnect',
      userId: socket.id,
      username: userInfo.username || 'unknown',
      timestamp: new Date().toISOString()
    };

    // Add to Redis list for disconnect logs
    await redisClient.lPush('disconnect_logs', JSON.stringify(disconnectLogEntry));
    await redisClient.lTrim('disconnect_logs', 0, 999); // Keep only last 1000 entries

    // Remove user from active users
    const index = activeUsers.indexOf(socket.id);
    if (index > -1) {
      activeUsers.splice(index, 1);
    }

    // Remove user session from Redis
    await redisClient.del(`user_sessions:${socket.id}`);

    // Notify others about the updated queue
    io.to('jukebox').emit('queue_updated', { queues: await getQueueStatus() });
  });
});

// Helper function to get queue status
async function getQueueStatus() {
  const queueStatus = [];

  for (const userId of activeUsers) {
    const queue = await redisClient.lRange(`queue:${userId}`, 0, -1);
    const userInfo = await redisClient.hGetAll(`user_sessions:${userId}`);
    queueStatus.push({
      user: userInfo.username || userId,
      queue: queue
    });
  }

  return queueStatus;
}

// API endpoint to get current queue
app.get('/api/queue', async (req, res) => {
  const queues = await getQueueStatus();
  res.json(queues);
});

// API endpoint to get visit logs
app.get('/api/logs/visits', async (req, res) => {
  try {
    const logs = await redisClient.lRange('visit_logs', 0, -1);
    const parsedLogs = logs.map(log => JSON.parse(log));
    res.json(parsedLogs);
  } catch (error) {
    console.error('Error retrieving visit logs:', error);
    res.status(500).json({ error: 'Could not retrieve visit logs' });
  }
});

// API endpoint to get user join logs
app.get('/api/logs/joins', async (req, res) => {
  try {
    const logs = await redisClient.lRange('join_logs', 0, -1);
    const parsedLogs = logs.map(log => JSON.parse(log));
    res.json(parsedLogs);
  } catch (error) {
    console.error('Error retrieving join logs:', error);
    res.status(500).json({ error: 'Could not retrieve join logs' });
  }
});

// API endpoint to get daily visitor statistics
app.get('/api/stats/daily-visitors', async (req, res) => {
  try {
    const dailyVisitors = await redisClient.hGetAll('daily_visitors');
    res.json(dailyVisitors);
  } catch (error) {
    console.error('Error retrieving daily visitor stats:', error);
    res.status(500).json({ error: 'Could not retrieve daily visitor stats' });
  }
});

// API endpoint to get song addition logs
app.get('/api/logs/songs', async (req, res) => {
  try {
    const logs = await redisClient.lRange('song_logs', 0, -1);
    const parsedLogs = logs.map(log => JSON.parse(log));
    res.json(parsedLogs);
  } catch (error) {
    console.error('Error retrieving song logs:', error);
    res.status(500).json({ error: 'Could not retrieve song logs' });
  }
});

// API endpoint to get user disconnect logs
app.get('/api/logs/disconnects', async (req, res) => {
  try {
    const logs = await redisClient.lRange('disconnect_logs', 0, -1);
    const parsedLogs = logs.map(log => JSON.parse(log));
    res.json(parsedLogs);
  } catch (error) {
    console.error('Error retrieving disconnect logs:', error);
    res.status(500).json({ error: 'Could not retrieve disconnect logs' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit logs and statistics available at /api/logs and /api/stats endpoints`);
});