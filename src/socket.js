import jwt from 'jsonwebtoken';

const connectedUsers = new Map();

export const configureSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token missing'));

    jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key', (err, decoded) => {
      if (err) return next(new Error('Invalid token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const { userId, username } = socket.user;

    connectedUsers.forEach(update => socket.emit('location_update', update));

    socket.on('location_update', (location) => {
      const update = { userId, username, location, timestamp: Date.now(), status: 'online' };
      connectedUsers.set(userId, update);
      io.emit('location_update', update);
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      io.emit('location_update', { userId, status: 'offline', timestamp: Date.now() });
    });
  });
};
