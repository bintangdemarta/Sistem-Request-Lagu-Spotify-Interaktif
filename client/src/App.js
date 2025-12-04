import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [queues, setQueues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Listen for queue updates
    socket.on('queue_updated', (data) => {
      setQueues(data.queues);
    });

    // Listen for now playing updates
    socket.on('now_playing', (data) => {
      setCurrentTrack(data);
    });

    return () => {
      socket.off('queue_updated');
      socket.off('now_playing');
    };
  }, []);

  const joinSession = () => {
    if (username.trim()) {
      socket.emit('join_session', { username });
      setJoined(true);
    }
  };

  const addSong = (trackUri) => {
    socket.emit('add_song', { trackUri });
    setSearchQuery(''); // Clear search after adding
    setSearchResults([]); // Clear search results after adding
  };

  const searchSongs = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      // Simulate API call delay
      setTimeout(() => {
        // In a real app, this would connect to Spotify API
        // For demo purposes, we'll return mock data
        const mockResults = [
          { id: '1', name: `${searchQuery} - Mock Song 1`, artist: 'Mock Artist', uri: 'spotify:track:1', album: 'Mock Album 1', duration: '3:25' },
          { id: '2', name: `${searchQuery} - Mock Song 2`, artist: 'Mock Artist 2', uri: 'spotify:track:2', album: 'Mock Album 2', duration: '4:10' },
          { id: '3', name: `${searchQuery} - Mock Song 3`, artist: 'Mock Artist 3', uri: 'spotify:track:3', album: 'Mock Album 3', duration: '2:55' }
        ];
        setSearchResults(mockResults);
        setIsSearching(false);
      }, 800); // Simulate API delay
    } else {
      setSearchResults([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchSongs();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Spotify Collaborative Jukebox</h1>
        <p className="subtitle">Fair Queue System - Everyone gets a turn!</p>

        {!joined ? (
          <div className="session-info">
            <h2>Join the Music Session</h2>
            <div className="join-session-form">
              <input
                className="join-session-input"
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinSession()}
              />
              <button onClick={joinSession}>Join Session</button>
            </div>
            <p className="instructions">
              After joining, you can search for songs and add them to your personal queue.
              The system uses a fair queuing algorithm so everyone gets a turn!
            </p>
          </div>
        ) : (
          <div>
            <div className="welcome-message">
              <h2>Welcome, {username}! 🎶</h2>
              <p>You're now part of the collaborative jukebox</p>
            </div>

            <div className="search-container">
              <h3>🎵 Search for Songs</h3>
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search for a song, artist, or album..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button onClick={searchSongs} disabled={isSearching}>
                  {isSearching ? 'Searching...' : '🔍 Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="search-results">
                  <h4>Search Results:</h4>
                  <ul>
                    {searchResults.map(track => (
                      <li key={track.id}>
                        <div>
                          <strong>{track.name}</strong>
                          <div className="track-info">
                            <span>by {track.artist}</span>
                            <span className="album">| Album: {track.album}</span>
                            <span className="duration">| {track.duration}</span>
                          </div>
                        </div>
                        <button onClick={() => addSong(track.uri)}>Add to Queue</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {currentTrack && (
              <div className="now-playing">
                <h3>🎵 Now Playing</h3>
                <div className="now-playing-info">
                  <h4>{currentTrack.track?.name || 'Loading...'}</h4>
                  <p className="now-playing-status">
                    by <strong>{currentTrack.track?.artist || 'Unknown Artist'}</strong>
                  </p>
                  <p className="now-playing-status">
                    Status: {currentTrack.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                  </p>
                </div>
              </div>
            )}

            <div className="queue-container">
              <h3>📋 Current Queue Status</h3>
              {queues.length > 0 ? (
                <ul>
                  {queues.map((userQueue, index) => (
                    <li key={index} className="user-queue">
                      <div>
                        <strong>{userQueue.user}</strong>
                        <span> - {userQueue.queue.length} {userQueue.queue.length === 1 ? 'song' : 'songs'}</span>
                      </div>
                      <div className="progress-bar">
                        {userQueue.queue.length > 0 && (
                          <div className="progress">
                            <div
                              className="progress-fill"
                              style={{width: `${Math.min(100, userQueue.queue.length * 10)}%`}}
                            ></div>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No one has added songs yet. Be the first to search and add a song!</p>
              )}
            </div>

            <div className="fair-queuing-info">
              <h4>⚖️ Fair Queuing System</h4>
              <p>
                This system uses Deficit Round Robin (DRR) scheduling to ensure everyone gets a fair turn.
                Instead of a first-come-first-served approach, we rotate between users to play their requested songs.
              </p>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;