import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '?';

const createMeIcon = () => L.divIcon({
  className: 'custom-marker-container',
  html: '<div class="apple-me-marker"><div class="apple-pulse-ring"></div></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
});

const createUserIcon = (color, initials) => L.divIcon({
  className: 'custom-marker-container',
  html: '<div class="apple-user-marker" style="background-color: ' + color + ';">' + initials + '</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return 'hsl(' + (Math.abs(hash) % 360) + ', 70%, 55%)';
};

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

const LocateControl = ({ myLocation }) => {
  const map = useMap();
  return (
    <button className="locate-me-fab" onClick={() => myLocation && map.flyTo([myLocation.lat, myLocation.lng], 15, { duration: 1 })} title="Find My Location">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    </button>
  );
};

export default function MapView({ socket, user, onLogout }) {
  const [users, setUsers] = useState({});
  const [myLocation, setMyLocation] = useState(null);

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
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          if (socket?.connected) socket.emit('location_update', loc);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    };
    send();
    const id = setInterval(send, 10000);
    return () => clearInterval(id);
  }, [socket]);

  const others = Object.values(users).filter(u => u.userId !== user.userId);

  return (
    <div className="apple-layout">
      <aside className="apple-sidebar">
        <div className="sidebar-header">
          <div className="logo-area">
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
          {others.map(u => (
            <div className="user-row" key={u.userId}>
              <div className="user-avatar" style={{ background: stringToColor(u.username || u.userId) }}>
                {getInitials(u.username || u.userId)}
              </div>
              <div className="user-details">
                <span className="user-name">{u.username || u.userId}</span>
                <span className="user-time">Updated {new Date(u.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="apple-map-wrapper">
        <MapContainer center={[20, 0]} zoom={3} scrollWheelZoom={true} className="map-container" zoomControl={false}>
          <MapUpdater myLocation={myLocation} />
          <TileLayer attribution="OpenStreetMap CARTO" url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" className="apple-map-tiles" />
          {myLocation && (
            <Marker position={[myLocation.lat, myLocation.lng]} icon={createMeIcon()}>
              <Popup className="custom-popup"><b>You</b><br/><small>Current Location</small></Popup>
            </Marker>
          )}
          {others.map(u => (
            <Marker key={u.userId} position={[u.location.lat, u.location.lng]} icon={createUserIcon(stringToColor(u.username || u.userId), getInitials(u.username || u.userId))}>
              <Popup className="custom-popup"><b>{u.username || u.userId}</b><br/><small>Updated {new Date(u.timestamp).toLocaleTimeString()}</small></Popup>
            </Marker>
          ))}
          <div className="apple-floating-controls">
            <LocateControl myLocation={myLocation} />
          </div>
        </MapContainer>
      </main>
    </div>
  );
}
