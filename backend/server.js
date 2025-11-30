// Version: 2.0.0 - Full Minesweeper Game Logic
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

// Generate minesweeper board
function generateBoard(width, height, mines, firstClickRow, firstClickCol) {
  const board = Array(height).fill(null).map(() => Array(width).fill(0));
  const minePositions = new Set();
  
  // Generate mine positions (avoiding first click)
  while (minePositions.size < mines) {
    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    const key = `${row},${col}`;
    
    // Don't place mine on first click or adjacent cells
    if (row === firstClickRow && col === firstClickCol) continue;
    if (Math.abs(row - firstClickRow) <= 1 && Math.abs(col - firstClickCol) <= 1) continue;
    
    minePositions.add(key);
    board[row][col] = -1; // -1 represents a mine
  }
  
  // Calculate numbers for each cell
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (board[row][col] === -1) continue;
      
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < height && nc >= 0 && nc < width && board[nr][nc] === -1) {
            count++;
          }
        }
      }
      board[row][col] = count;
    }
  }
  
  return board;
}

// Flood fill for revealing empty cells
function revealCellRecursive(board, revealed, row, col, width, height) {
  if (row < 0 || row >= height || col < 0 || col >= width) return;
  if (revealed[row][col]) return;
  if (board[row][col] === -1) return; // Don't reveal mines
  
  revealed[row][col] = true;
  
  // If cell is empty (0), reveal adjacent cells
  if (board[row][col] === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        revealCellRecursive(board, revealed, row + dr, col + dc, width, height);
      }
    }
  }
}

// Check if game is won
function checkWin(board, revealed, flagged, width, height, mines) {
  let revealedCount = 0;
  let correctFlags = 0;
  
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (revealed[row][col]) revealedCount++;
      if (flagged[row][col] && board[row][col] === -1) correctFlags++;
    }
  }
  
  const totalCells = width * height;
  const nonMineCells = totalCells - mines;
  
  return revealedCount === nonMineCells || correctFlags === mines;
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
      cursorPositions: new Map(),
      firstClick: null
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
    
    // Send current game state if game is in progress
    if (room.gameState) {
      socket.emit('game-initialized', room.gameState);
    }
    
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
      const gameState = {
        width,
        height,
        mines,
        board: null, // Will be generated on first click
        revealed: Array(height).fill(null).map(() => Array(width).fill(false)),
        flagged: Array(height).fill(null).map(() => Array(width).fill(false)),
        gameOver: false,
        won: false
      };
      
      room.gameState = gameState;
      room.firstClick = null;
      io.to(roomCode).emit('game-initialized', gameState);
    }
  });

  // Handle cell reveal
  socket.on('reveal-cell', ({ roomCode, row, col }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.gameOver) return;
    
    const { board, revealed, flagged, width, height, mines } = room.gameState;
    
    // Don't reveal if already revealed or flagged
    if (revealed[row][col] || flagged[row][col]) return;
    
    // Generate board on first click (to avoid clicking mine on first try)
    if (!board) {
      room.firstClick = { row, col };
      const newBoard = generateBoard(width, height, mines, row, col);
      room.gameState.board = newBoard;
    }
    
    const currentBoard = room.gameState.board;
    
    // Check if clicked on mine
    if (currentBoard[row][col] === -1) {
      room.gameState.gameOver = true;
      room.gameState.won = false;
      // Reveal all mines
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          if (currentBoard[r][c] === -1) {
            room.gameState.revealed[r][c] = true;
          }
        }
      }
      io.to(roomCode).emit('game-over', { won: false, board: currentBoard, revealed: room.gameState.revealed });
      return;
    }
    
    // Reveal cell with flood fill
    revealCellRecursive(currentBoard, room.gameState.revealed, row, col, width, height);
    
    // Check win condition
    if (checkWin(currentBoard, room.gameState.revealed, room.gameState.flagged, width, height, mines)) {
      room.gameState.gameOver = true;
      room.gameState.won = true;
      io.to(roomCode).emit('game-over', { won: true, board: currentBoard, revealed: room.gameState.revealed });
    } else {
      // Send update
      io.to(roomCode).emit('cell-revealed', { 
        row, 
        col, 
        playerId: socket.id,
        value: currentBoard[row][col],
        revealed: room.gameState.revealed
      });
    }
  });

  // Handle cell flag
  socket.on('flag-cell', ({ roomCode, row, col, flagged }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.gameOver) return;
    if (room.gameState.revealed[row][col]) return; // Can't flag revealed cells
    
    room.gameState.flagged[row][col] = flagged;
    
    // Check win condition after flagging
    const { board, revealed, flagged: flags, width, height, mines } = room.gameState;
    if (board && checkWin(board, revealed, flags, width, height, mines)) {
      room.gameState.gameOver = true;
      room.gameState.won = true;
      io.to(roomCode).emit('game-over', { won: true, board, revealed });
    } else {
      io.to(roomCode).emit('cell-flagged', { 
        row, 
        col, 
        flagged, 
        playerId: socket.id 
      });
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
  console.log(`WebSocket server running on port ${PORT} (Version 2.0.0)`);
});
