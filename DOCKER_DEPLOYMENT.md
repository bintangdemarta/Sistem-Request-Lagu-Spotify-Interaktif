# 🎵 Spotify Collaborative Jukebox - Docker Deployment Guide

This guide explains how to run the Spotify Collaborative Jukebox application using Docker and Docker Compose.

## Prerequisites

- Docker Engine (v20.10 or later)
- Docker Compose (v2.0 or later)
- Spotify Premium Account (required for the Host to play music)
- Spotify Developer App (create one at [developer.spotify.com](https://developer.spotify.com))

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/username/spotify-collaborative-jukebox.git
cd spotify-collaborative-jukebox
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with the following content:

```env
# Server Config
PORT=5000
NODE_ENV=production
CLIENT_URL=http://localhost:3000

# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/callback

# Database & Security
REDIS_URL=redis://redis:6379
SESSION_SECRET=a_very_long_random_string_for_production

# Spotify Scopes (Access Permissions)
SPOTIFY_SCOPES=streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state
```

**Important Notes:**
- Replace `your_spotify_client_id` and `your_spotify_client_secret` with your actual Spotify Developer credentials
- Ensure `http://localhost:5000/auth/callback` is added to "Redirect URIs" in your Spotify Developer Dashboard settings
- Use a strong, random string for `SESSION_SECRET` in production

### 3. Build and Run with Docker Compose

```bash
# Build and start all services in the background
docker-compose up --build -d

# View logs to monitor startup
docker-compose logs -f
```

The application will be available at:
- Client (Frontend): [http://localhost:3000](http://localhost:3000)
- Server (API): [http://localhost:5000](http://localhost:5000)

### 4. Alternative: Run in Foreground

```bash
# Build and start all services in the foreground (to see logs in real-time)
docker-compose up --build
```

## 🚀 Usage Guide

### As Host (Admin)
1. Open the application at [http://localhost:3000](http://localhost:3000) on a laptop/PC connected to speakers
2. Click "Login with Spotify"
3. Grant the necessary permissions
4. On the Dashboard, click "Connect Player" to initialize the Web Playback SDK
5. Important: Keep this browser tab open to ensure the music continues playing

### As Guest (User)
1. Open the application via smartphone on the same network
2. Enter your Display Name (no password required)
3. Search for a song (system uses 500ms Debounce to minimize API calls)
4. Click `Add (+)` button. Your song will enter your personal queue and be scheduled automatically

## 🛠 Development Mode

If you want to run in development mode with hot reloading:

```bash
# Use the development compose file
docker-compose -f docker-compose.dev.yml up
```

> Note: The development compose file would need to be created separately to enable hot-reloading for development.

## 🐳 Docker Compose Services

The application consists of the following services:

- `server`: Node.js/Express API server with Socket.IO
- `client`: React frontend served by Nginx
- `redis`: Redis database for session storage and queue management

## 🔧 Managing the Application

```bash
# Stop the application
docker-compose down

# Stop and remove volumes (will lose Redis data)
docker-compose down -v

# View logs for specific service
docker-compose logs server
docker-compose logs client
docker-compose logs redis

# Restart specific service
docker-compose restart server

# Scale services (not typically needed for this app)
docker-compose up --scale server=2
```

## ⚠️ Known Issues & Solutions

1. **Spotify API Issues**: If you encounter authentication problems, ensure your Spotify app settings have the correct redirect URI.

2. **Playback Issues**: Chrome browsers may block automatic audio playback. The Host must interact (click) at least once on the page before the SDK can start playback.

3. **Network Issues**: For guests to connect properly, ensure they are on the same network as the host.

## 🎨 Enhanced UI/UX

The application now features a beautiful, modern interface with:

- **Dark theme** with Spotify-inspired green accents
- **Responsive design** that works on both desktop and mobile devices
- **Visual queue indicators** showing each user's song count with progress bars
- **Improved search results** with album and duration information
- **Now playing section** with status indicators
- **Fair queuing information** explaining the algorithm

## 📊 Logging and Analytics

The application now includes comprehensive logging capabilities using Redis:

### Available Log Types
- **Visit Logs**: Track all website visits with IP address, user agent, and timestamps
- **Join Logs**: Record when users join the session
- **Song Logs**: Log when users add songs to queues
- **Disconnect Logs**: Track when users leave the session
- **Daily Statistics**: Count daily visitors

### API Endpoints for Logs
- `GET /api/logs/visits` - Retrieve all website visit logs
- `GET /api/logs/joins` - Retrieve user join event logs
- `GET /api/logs/songs` - Retrieve song addition logs
- `GET /api/logs/disconnects` - Retrieve user disconnect logs
- `GET /api/stats/daily-visitors` - Get daily visitor statistics

All logs are stored in Redis with automatic capping (last 1000 entries) to prevent excessive memory usage.

## 🤝 Contributing

This project is open for contribution. Suggested areas for future development:
- Voting Skip: Allow guests to vote to skip the currently playing song
- Karaoke Mode: Display song lyrics on the Host screen using a third-party API
- Genre Filtering: Add advanced search filters (e.g., genre:rock, year:2023) to refine requests

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.