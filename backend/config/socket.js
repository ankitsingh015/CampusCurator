const socketIo = require('socket.io');

let io;

// Initialize Socket.io
const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user to their personal room
    socket.on('join', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

// Get Socket.io instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit notification to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
};

// Emit notification to multiple users
const emitToUsers = (userIds, event, data) => {
  if (io) {
    userIds.forEach(userId => {
      io.to(`user-${userId}`).emit(event, data);
    });
  }
};

// Emit to all connected clients
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToUsers,
  emitToAll
};
