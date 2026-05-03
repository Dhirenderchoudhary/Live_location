import jwt from 'jsonwebtoken';

const connectedUsers = new Map();

export const configureSocket = (io) => {
  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Token missing'));

    jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key', (err, decoded) => {
      if (err) return next(new Error('Authentication error: Invalid token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    const username = socket.user.username;
    console.log(`User connected: ${username} (${socket.id})`);

    // Send the current active state to the new client
    const activeState = Array.from(connectedUsers.values());
    activeState.forEach(update => {
      socket.emit('location_update', update);
    });

    socket.on('location_update', (location) => {
      const update = {
        userId,
        username,
        location,
        timestamp: Date.now(),
        status: 'online'
      };
      
      // Keep track in memory
      connectedUsers.set(userId, update);
      
      // Broadcast directly to all clients (replaces Kafka for single-instance free tier)
      io.emit('location_update', update);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      connectedUsers.delete(userId);
      
      const update = {
        userId,
        status: 'offline',
        timestamp: Date.now()
      };
      
      io.emit('location_update', update);
    });
  });
};
