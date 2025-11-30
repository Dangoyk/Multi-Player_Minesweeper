import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store game rooms
const rooms = new Map();

// Generate a random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates a new game room
  socket.on('host-game', () => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    const room = {
      code: roomCode,
      host: socket.id,
      players: [socket.id],
      gameState: null,
      cursorPositions: new Map()
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('room-created', { roomCode });
    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });

  // Player joins an existing room
  socket.on('join-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('join-error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('join-error', { message: 'Room is full' });
      return;
    }

    room.players.push(socket.id);
    socket.join(roomCode);
    socket.emit('joined-room', { roomCode, isHost: socket.id === room.host });
    
    // Notify other players
    socket.to(roomCode).emit('player-joined', { playerId: socket.id });
    console.log(`Player ${socket.id} joined room ${roomCode}`);
  });

  // Update cursor position
  socket.on('cursor-move', ({ roomCode, x, y }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.cursorPositions.set(socket.id, { x, y, playerId: socket.id });
      socket.to(roomCode).emit('cursor-update', {
        playerId: socket.id,
        x,
        y
      });
    }
  });

  // Initialize game
  socket.on('init-game', ({ roomCode, width, height, mines }) => {
    const room = rooms.get(roomCode);
    if (room && socket.id === room.host) {
      // Generate game board (simplified - you'll implement actual minesweeper logic)
      const gameState = {
        width,
        height,
        mines,
        board: [], // Will be generated on backend
        revealed: [],
        flagged: [],
        gameOver: false,
        won: false
      };
      
      room.gameState = gameState;
      io.to(roomCode).emit('game-initialized', gameState);
    }
  });

  // Handle cell reveal
  socket.on('reveal-cell', ({ roomCode, row, col }) => {
    const room = rooms.get(roomCode);
    if (room && room.gameState) {
      // Broadcast to all players in room
      io.to(roomCode).emit('cell-revealed', { row, col, playerId: socket.id });
    }
  });

  // Handle cell flag
  socket.on('flag-cell', ({ roomCode, row, col, flagged }) => {
    const room = rooms.get(roomCode);
    if (room && room.gameState) {
      io.to(roomCode).emit('cell-flagged', { row, col, flagged, playerId: socket.id });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up rooms
    for (const [roomCode, room] of rooms.entries()) {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter(id => id !== socket.id);
        room.cursorPositions.delete(socket.id);
        
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          socket.to(roomCode).emit('player-left', { playerId: socket.id });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

