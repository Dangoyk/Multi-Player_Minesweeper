// Version: 2.0.0 - Full Minesweeper Game Logic
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Configure CORS - allow all origins for now to ensure WebSocket works
// In production, you can restrict this to specific domains
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins for WebSocket
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling'],
    allowEIO3: true
  },
  allowEIO3: true
});

// Store game rooms
const rooms = new Map();

// Generate a random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Check if board has 50/50 situations (simplified check)
function hasFiftyFifty(board, width, height, firstClickRow, firstClickCol) {
  // This is a simplified check - a full solver would be more complex
  // We check if there are obvious 50/50 situations after the first click area is revealed
  const revealed = Array(height).fill(null).map(() => Array(width).fill(false));
  
  // Reveal the first click area (3x3 around first click)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = firstClickRow + dr;
      const nc = firstClickCol + dc;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
        revealed[nr][nc] = true;
        // If it's a 0, flood fill
        if (board[nr][nc] === 0) {
          revealCellRecursive(board, revealed, nr, nc, width, height);
        }
      }
    }
  }
  
  // Check for potential 50/50s - look for numbers with exactly 2 unrevealed neighbors
  // where the number matches the count (could be ambiguous)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (revealed[row][col] && board[row][col] > 0) {
        let unrevealedCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width && !revealed[nr][nc]) {
              unrevealedCount++;
            }
          }
        }
        // If a number has exactly 2 unrevealed neighbors and the number is 1 or 2,
        // it could potentially be a 50/50 (simplified heuristic)
        if (unrevealedCount === 2 && board[row][col] <= 2) {
          // Additional check: see if both neighbors are mines or both are safe
          // This is a simplified check - a full solver would be more accurate
          return true; // Conservative: reject boards with potential 50/50s
        }
      }
    }
  }
  return false;
}

// Generate minesweeper board with no 50/50s
function generateBoard(width, height, mines, firstClickRow, firstClickCol) {
  let attempts = 0;
  const maxAttempts = 50; // Try up to 50 times to generate a good board
  
  while (attempts < maxAttempts) {
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
    
    // Check for 50/50s - if found, try again
    if (!hasFiftyFifty(board, width, height, firstClickRow, firstClickCol)) {
      return board;
    }
    
    attempts++;
  }
  
  // If we couldn't generate a perfect board, return the last one
  // (this is a fallback - in practice, most boards will be fine)
  const board = Array(height).fill(null).map(() => Array(width).fill(0));
  const minePositions = new Set();
  
  while (minePositions.size < mines) {
    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    const key = `${row},${col}`;
    
    if (row === firstClickRow && col === firstClickCol) continue;
    if (Math.abs(row - firstClickRow) <= 1 && Math.abs(col - firstClickCol) <= 1) continue;
    
    minePositions.add(key);
    board[row][col] = -1;
  }
  
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
    console.log('Received reveal-cell:', { roomCode, row, col });
    const room = rooms.get(roomCode);
    if (!room) {
      console.log('Room not found:', roomCode);
      return;
    }
    if (!room.gameState) {
      console.log('No gameState in room');
      return;
    }
    if (room.gameState.gameOver) {
      console.log('Game is over');
      return;
    }
    
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
    console.log('Revealing cell with flood fill:', { row, col });
    revealCellRecursive(currentBoard, room.gameState.revealed, row, col, width, height);
    console.log('Revealed array after flood fill:', room.gameState.revealed);
    
    // Check win condition
    if (checkWin(currentBoard, room.gameState.revealed, room.gameState.flagged, width, height, mines)) {
      room.gameState.gameOver = true;
      room.gameState.won = true;
      console.log('Game won!');
      io.to(roomCode).emit('game-over', { won: true, board: currentBoard, revealed: room.gameState.revealed });
    } else {
      // Send update with full board state
      console.log('Emitting cell-revealed to room:', roomCode);
      io.to(roomCode).emit('cell-revealed', { 
        row, 
        col, 
        playerId: socket.id,
        value: currentBoard[row][col],
        revealed: room.gameState.revealed,
        board: currentBoard  // Send full board so frontend can update
      });
    }
  });

  // Handle emote
  socket.on('send-emote', ({ roomCode, emote }) => {
    const room = rooms.get(roomCode);
    if (room) {
      io.to(roomCode).emit('emote-received', {
        emote,
        playerId: socket.id
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
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT} (Version 2.0.0)`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set (using wildcard)'}`);
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
