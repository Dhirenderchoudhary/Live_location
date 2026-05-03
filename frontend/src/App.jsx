import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import MapView from './Map';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await response.json();
      if (data.token) {
        setUser(data);
        
        // Connect socket with token (uses relative host automatically)
        const newSocket = io({
          auth: { token: data.token }
        });
        
        setSocket(newSocket);
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setUser(null);
  };

  // Ask for location permission early if logged in
  useEffect(() => {
    if (user) {
      navigator.geolocation.getCurrentPosition(
        () => console.log('Location permission granted'),
        (err) => console.error('Location permission denied', err)
      );
    }
  }, [user]);

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Live Tracker</h1>
          <p>Sign in to share your location and see others.</p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Join Map'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <MapView socket={socket} user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;
