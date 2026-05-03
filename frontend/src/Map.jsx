import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Apple Maps Style Markers ────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return '?';
  return name.substring(0, 2).toUpperCase();
};

// Current User (Pulsing Blue Dot)
const createAppleMeIcon = () => {
  const html = `
    <div class="apple-me-marker">
      <div class="apple-pulse-ring"></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-marker-container',
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
};

// Other Users (Small Avatar)
const createAppleUserIcon = (color, initials = '') => {
  const html = `
    <div class="apple-user-marker" style="background-color: ${color};">
      ${initials}
    </div>
  `;
  return L.divIcon({
    className: 'custom-marker-container',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`; // Muted but colorful iOS style
};

// Auto-center map initially
const MapUpdater = ({ myLocation }) => {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (myLocation && !hasCentered) {
      map.flyTo([myLocation.lat, myLocation.lng], 15, { duration: 1.5 });
      setHasCentered(true);
    }
  }, [myLocation, map, hasCentered]);

  return null;
};

// Locate Me FAB
const LocateControl = ({ myLocation }) => {
  const map = useMap();
  return (
    <button 
      className="locate-me-fab" 
      onClick={() => myLocation && map.flyTo([myLocation.lat, myLocation.lng], 15, { duration: 1 })}
      title="Find My Location"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    </button>
  );
};

const MapView = ({ socket, user, onLogout }) => {
  const [users, setUsers] = useState({});
  const [myLocation, setMyLocation] = useState(null);
  const currentUserId = user.userId;

  useEffect(() => {
    if (!socket) return;
    socket.on('location_update', (data) => {
      setUsers((prev) => {
        const next = { ...prev };
        if (data.status === 'offline') delete next[data.userId];
        else next[data.userId] = data;
        return next;
      });
    });
    return () => socket.off('location_update');
  }, [socket]);

  useEffect(() => {
    let intervalId;
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          if (socket?.connected) socket.emit('location_update', loc);
        },
        (err) => console.warn('Location access denied or unavailable.', err),
        { enableHighAccuracy: true }
      );
    };

    sendLocation();
    intervalId = setInterval(sendLocation, 10_000);
    return () => clearInterval(intervalId);
  }, [socket]);

  const defaultCenter = [20, 0];
  const activeUsersList = Object.values(users).filter(u => u.userId !== currentUserId);

  return (
    <div className="apple-layout">
      {/* ── FULL HEIGHT LEFT SIDEBAR ── */}
      <aside className="apple-sidebar">
        <div className="sidebar-header">
          <div className="logo-area">
            <svg viewBox="0 0 170 170" width="18" height="18" fill="white">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.92.21-9.84-1.96-14.75-6.53-3.13-2.73-7.1-7.43-11.87-14.09-5.04-7.06-9.62-15.65-13.75-25.77-4.12-10.12-6.18-19.8-6.18-29.04 0-11.84 3.18-21.75 9.54-29.74 4.58-5.69 10.36-9.59 17.32-11.71 6.55-1.9 12.33-2.6 17.33-2.12 5.03.48 10.66 2.37 16.92 5.65 6.25 3.28 10.14 4.93 11.66 4.93 1.25 0 5.43-1.8 12.56-5.41 7.12-3.61 13.56-5.18 19.3-4.71 13.84 1.18 24.32 7.03 31.42 17.54-11.73 7.3-17.5 16.64-17.3 28.02.19 10.35 4.3 18.72 12.34 25.13 4.29 3.4 9.42 5.56 15.39 6.47-2.61 8.28-5.83 15.42-9.67 21.43zM108.64 25.12c0 8.01-3.23 15.65-9.68 22.9-6.98 7.82-15.41 12.21-25.32 13.17-.23-1.14-.35-2.58-.35-4.3 0-8.28 3.39-16.14 10.17-23.58 6.53-7.17 14.86-11.39 24.97-12.65.12 1.39.21 2.87.21 4.46z"/>
            </svg>
            <span className="logo-text">LiveTrack</span>
          </div>
          <button className="logout-icon-btn" onClick={onLogout} title="Log Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-search">
          <input type="text" placeholder="Search Users..." />
        </div>

        <div className="sidebar-menu-title">ACTIVE TRACKERS</div>

        <div className="users-list">
          <div className="user-row active-me">
            <div className="user-avatar" style={{ background: 'var(--primary-color)' }}>ME</div>
            <div className="user-details">
              <span className="user-name">{user.username}</span>
              <span className="user-time live-text">Broadcasting location</span>
            </div>
          </div>
          
          {activeUsersList.map(u => {
            const color = stringToColor(u.username || u.userId);
            return (
              <div className="user-row" key={u.userId}>
                <div className="user-avatar" style={{ background: color }}>
                  {getInitials(u.username || u.userId)}
                </div>
                <div className="user-details">
                  <span className="user-name">{u.username || u.userId}</span>
                  <span className="user-time">Updated {new Date(u.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── FULL HEIGHT MAP AREA ── */}
      <main className="apple-map-wrapper">
        <MapContainer center={defaultCenter} zoom={3} scrollWheelZoom={true} className="map-container" zoomControl={false}>
          <MapUpdater myLocation={myLocation} />
          
          {/* TileLayer using Voyager inverted to perfectly mimic Apple Maps Web Dark Mode */}
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            className="apple-map-tiles"
          />
          
          {/* Current User Marker */}
          {myLocation && (
            <Marker position={[myLocation.lat, myLocation.lng]} icon={createAppleMeIcon()}>
              <Popup className="custom-popup">
                <b>You</b><br/><small>Current Location</small>
              </Popup>
            </Marker>
          )}

          {/* Other Users */}
          {activeUsersList.map((u2) => {
            const color = stringToColor(u2.username || u2.userId);
            const initials = getInitials(u2.username || u2.userId);
            return (
              <Marker 
                key={u2.userId} 
                position={[u2.location.lat, u2.location.lng]}
                icon={createAppleUserIcon(color, initials)}
              >
                <Popup className="custom-popup">
                  <b>{u2.username || u2.userId}</b><br/>
                  <small>Updated {new Date(u2.timestamp).toLocaleTimeString()}</small>
                </Popup>
              </Marker>
            );
          })}

          {/* Floating Map Controls MUST be inside MapContainer for useMap to work */}
          <div className="apple-floating-controls">
             <LocateControl myLocation={myLocation} />
          </div>
        </MapContainer>
      </main>
    </div>
  );
};

export default MapView;
