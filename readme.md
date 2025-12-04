# 🎵 Spotify Collaborative Jukebox (Fair Queuing Edition)

A democratic music queue system based on Node.js, React, Redis, and Socket.IO featuring a Fair Queuing algorithm and browser-native playback.

[![Status](https://img.shields.io/badge/status-production_ready-success)](#)
[![Tech Stack](https://img.shields.io/badge/tech-MERN_%2B_Redis-red)](#)

## 📖 Background & Problem

In social environments (offices, cafes, or parties), relying on a single Spotify account often leads to "queue monopoly," where one enthusiastic user floods the playlist with their own choices. The standard Add to Queue feature operates on a FIFO (First-In, First-Out) basis, which is inherently unfair in a collaborative context as it forces latecomers to wait indefinitely.

This application solves that problem by implementing Deficit Round Robin (DRR) Scheduling. The system doesn't just stack songs linearly; it rotates turns between active users, ensuring everyone gets a fair chance to hear their requests regardless of when they joined.

## ✨ Key Features ("Developed Better")

1. **⚖️ Fair Queuing Algorithm**
   - Instead of a single global queue, the system assigns a personal "bucket" or queue to every user in Redis.
   - Logic: If User A requests 10 songs and User B requests 1 song, the system interleaves them: Song A1 -> Song B1 -> Song A2 -> Song A3...
   - User B does not have to wait for User A's 10 songs to finish.

2. **⚡ Real-Time Synchronization (Socket.IO)**
   - State Management: Play/Pause status, progress bar position, and track changes are synchronized across all guest devices in milliseconds using WebSockets, avoiding the latency of HTTP polling.
   - Optimistic UI: Queue changes appear instantly on the user's screen before the server sends final confirmation, creating a snappy experience.

3. **🎧 Host Player (Web Playback SDK)**
   - Music plays directly from the Host's (Admin) browser using the Spotify Web Playback SDK.
   - No need for a separate Spotify desktop application; the browser becomes the "Spotify Connect" device.
   - Auto-Resume: Automatically handles playback state recovery.

4. **🛡️ Security & Token Management**
   - Token Rotation: The backend automatically swaps the Spotify refresh_token for a new access_token every 55 minutes, ensuring the music never stops due to authorization timeouts.
   - Ephemeral Auth: Frictionless session-based login (Display Name + Cookie) without passwords, secured with Rate Limiting to prevent API abuse.

## 🛠 Technical Architecture

### Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| Backend | Node.js + Express | API Gateway & OAuth Handler |
| Real-time | Socket.IO | Bi-directional event-driven communication |
| Database | Redis | Stores ephemeral sessions & queue data structures (Lists/Sets) for O(1) performance |
| Frontend | React.js | Responsive UI with Hooks (useSpotifyPlayer, useDebounce) |
| Audio | Spotify Web SDK | Encrypted audio rendering (DRM) in the browser |

### Database Structure (Redis)

The system uses the following data structures to manage the queue efficiently:

- `user_sessions:{id}` (Hash): Guest session data
- `active_users` (List): User rotation list for the Round Robin algorithm
- `queue:{user_id}` (List): Specific song queue per user
- `global_history` (Set): Prevents duplicate songs from being requested repeatedly

## 🚀 Installation Guide (Deployment)

### Prerequisites

- Node.js v16+
- Redis Server (Running locally on port 6379 or via Cloud)
- Spotify Premium Account (Required for the Host to play music)
- Spotify Developer App: Create one at [developer.spotify.com](https://developer.spotify.com)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/username/spotify-collaborative-jukebox.git
cd spotify-collaborative-jukebox

# Install Backend
npm install

# Install Frontend
cd client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root directory:

```env
# Server Config
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Spotify API Credentials
SPOTIFY_CLIENT_ID=get_from_spotify_dashboard
SPOTIFY_CLIENT_SECRET=get_from_spotify_dashboard
SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/callback

# Database & Security
REDIS_URL=redis://localhost:6379
SESSION_SECRET=change_to_a_long_random_string

# Spotify Scopes (Access Permissions)
SPOTIFY_SCOPES=streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state
```

> **Important Note**: Ensure `http://localhost:5000/auth/callback` is added to "Redirect URIs" in your Spotify Developer Dashboard settings.

### 3. Running the Application

Use the following command to run both the Server (Backend) and Client (Frontend) concurrently:

```bash
npm run dev
```

- Access the Guest Dashboard at: http://localhost:3000
- The Backend API runs at: http://localhost:5000

## 🕹 Usage Guide

### As Host (Admin)

1. Open the application on a laptop/PC connected to speakers.
2. Click "Login with Spotify".
3. Grant the necessary permissions.
4. On the Dashboard, click "Connect Player" to initialize the Web Playback SDK.

> **Important**: Keep this browser tab open to ensure the music continues playing.

### As Guest (User)

1. Open the application via smartphone on the same network.
2. Enter your Display Name (no password required).
3. Search for a song (system uses 500ms Debounce to minimize API calls).
4. Click `Add (+)`. Your song will enter your personal queue and be scheduled automatically.

## 🔌 API & Event Documentation

### Socket.IO Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `join_session` | Client -> Server | `{ username: string }` | Guest joins the session |
| `add_song` | Client -> Server | `{ trackUri: string }` | Request a new song |
| `queue_updated` | Server -> Client | `[{ track, user }]` | Broadcast updated queue to all users |
| `now_playing` | Server -> Client | `{ track, position, timestamp }` | Sync player status & time |

## Known Issues & Solutions

- **Missing Preview URL (2025)**: Spotify has deprecated and started removing `preview_url` from the Web API response.
  - Solution: This app does not rely on audio previews. Verification is done via Cover Art and Metadata.

- **Autoplay Policy**: Chrome browsers may block automatic audio playback.
  - Solution: The Host must interact (click) at least once on the page before the SDK can start playback.

## 🤝 Contribution & Development

This project is open for contribution. Suggested areas for future development:

- Voting Skip: Allow guests to vote to skip the currently playing song.
- Karaoke Mode: Display song lyrics on the Host screen using a third-party API.
- Genre Filtering: Add advanced search filters (e.g., `genre:rock`, `year:2023`) to refine requests.

## License

Distributed under the MIT License. See LICENSE for more information.