// Version: 2.0.0 - Full Minesweeper Game Logic
// Get WebSocket server URL from environment or use default
// For Vercel, this will be set via window.__WS_SERVER_URL__ or use default
const WS_SERVER_URL = window.__WS_SERVER_URL__ || 'http://localhost:3001';

// Initialize Socket.io connection
const socket = io(WS_SERVER_URL, {
    transports: ['websocket', 'polling']
});

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const hostBtn = document.getElementById('host-btn');
const joinBtn = document.getElementById('join-btn');
const joinForm = document.getElementById('join-form');
const roomCodeInput = document.getElementById('room-code-input');
const joinSubmitBtn = document.getElementById('join-submit-btn');
const cancelJoinBtn = document.getElementById('cancel-join-btn');
const roomInfo = document.getElementById('room-info');
const roomCodeDisplay = document.getElementById('room-code-display');
const waitingMessage = document.getElementById('waiting-message');
const readyMessage = document.getElementById('ready-message');
const gameRoomCode = document.getElementById('game-room-code');
const playerCount = document.getElementById('player-count');
const leaveGameBtn = document.getElementById('leave-game-btn');
const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const minesInput = document.getElementById('mines-input');
const startGameBtn = document.getElementById('start-game-btn');
const gameBoard = document.getElementById('game-board');
const gameStatus = document.getElementById('game-status');

let currentRoomCode = null;
let isHost = false;
let gameState = null;
let cursorPositions = new Map();
let cellSize = 30;

// Color scheme for numbers
const numberColors = [
    '', // 0 - no color
    '#0000FF', // 1 - blue
    '#008000', // 2 - green
    '#FF0000', // 3 - red
    '#000080', // 4 - dark blue
    '#800000', // 5 - maroon
    '#008080', // 6 - teal
    '#000000', // 7 - black
    '#808080'  // 8 - gray
];

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server (Version 2.0.0)');
});

socket.on('room-created', ({ roomCode }) => {
    currentRoomCode = roomCode;
    isHost = true;
    roomCodeDisplay.textContent = roomCode;
    roomInfo.classList.remove('hidden');
    waitingMessage.classList.remove('hidden');
    readyMessage.classList.add('hidden');
    playerCount.textContent = 'Players: 1/2';
});

socket.on('joined-room', ({ roomCode, isHost: hostStatus }) => {
    currentRoomCode = roomCode;
    isHost = hostStatus;
    gameRoomCode.textContent = roomCode;
    switchToGameScreen();
    playerCount.textContent = 'Players: 2/2';
});

socket.on('join-error', ({ message }) => {
    alert(message);
});

socket.on('player-joined', ({ playerId }) => {
    playerCount.textContent = 'Players: 2/2';
    waitingMessage.classList.add('hidden');
    readyMessage.classList.remove('hidden');
});

socket.on('player-left', ({ playerId }) => {
    playerCount.textContent = 'Players: 1/2';
    waitingMessage.classList.remove('hidden');
    readyMessage.classList.add('hidden');
});

socket.on('cursor-update', ({ playerId, x, y }) => {
    cursorPositions.set(playerId, { x, y });
    drawCursors();
});

socket.on('game-initialized', (state) => {
    gameState = state;
    initializeBoard();
    gameStatus.textContent = '';
    gameStatus.className = 'game-status';
});

socket.on('cell-revealed', ({ row, col, value, revealed }) => {
    if (revealed) {
        gameState.revealed = revealed;
    } else {
        gameState.revealed[row][col] = true;
    }
    drawBoard();
    drawCursors();
});

socket.on('cell-flagged', ({ row, col, flagged }) => {
    gameState.flagged[row][col] = flagged;
    drawBoard();
    drawCursors();
});

socket.on('game-over', ({ won, board, revealed }) => {
    gameState.board = board;
    gameState.revealed = revealed;
    gameState.gameOver = true;
    gameState.won = won;
    
    gameStatus.textContent = won ? '🎉 You Won! 🎉' : '💥 Game Over! 💥';
    gameStatus.className = won ? 'game-status won' : 'game-status lost';
    
    drawBoard();
    drawCursors();
});

// UI Event Handlers
hostBtn.addEventListener('click', () => {
    socket.emit('host-game');
});

joinBtn.addEventListener('click', () => {
    joinForm.classList.remove('hidden');
});

cancelJoinBtn.addEventListener('click', () => {
    joinForm.classList.add('hidden');
    roomCodeInput.value = '';
});

joinSubmitBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.toUpperCase().trim();
    if (code.length === 6) {
        socket.emit('join-game', { roomCode: code });
    } else {
        alert('Please enter a valid 6-character room code');
    }
});

leaveGameBtn.addEventListener('click', () => {
    socket.disconnect();
    socket.connect();
    switchToLobbyScreen();
    currentRoomCode = null;
    isHost = false;
    gameState = null;
});

startGameBtn.addEventListener('click', () => {
    if (!isHost) return;
    
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const mines = parseInt(minesInput.value);
    
    if (mines >= width * height) {
        alert('Too many mines for the board size!');
        return;
    }
    
    socket.emit('init-game', {
        roomCode: currentRoomCode,
        width,
        height,
        mines
    });
});

// Game Board Setup
function switchToGameScreen() {
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');
}

function switchToLobbyScreen() {
    gameScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    roomInfo.classList.add('hidden');
    joinForm.classList.add('hidden');
}

function initializeBoard() {
    if (!gameState) return;
    
    const width = gameState.width;
    const height = gameState.height;
    
    gameBoard.width = width * cellSize;
    gameBoard.height = height * cellSize;
    
    drawBoard();
}

function drawBoard() {
    if (!gameState || !gameState.board) {
        // Draw empty board before first click
        const ctx = gameBoard.getContext('2d');
        const width = gameState.width;
        const height = gameState.height;
        
        ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);
        
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const x = col * cellSize;
                const y = row * cellSize;
                
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(x, y, cellSize, cellSize);
                
                ctx.strokeStyle = '#808080';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cellSize, cellSize);
            }
        }
        return;
    }
    
    const ctx = gameBoard.getContext('2d');
    const width = gameState.width;
    const height = gameState.height;
    const board = gameState.board;
    const revealed = gameState.revealed;
    const flagged = gameState.flagged;
    
    ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);
    
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            
            if (revealed[row][col]) {
                // Draw revealed cell
                ctx.fillStyle = '#e0e0e0';
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Draw mine or number
                if (board[row][col] === -1) {
                    // Mine
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(x + cellSize/2, y + cellSize/2, cellSize/3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (board[row][col] > 0) {
                    // Number
                    ctx.fillStyle = numberColors[board[row][col]] || '#000000';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(board[row][col], x + cellSize/2, y + cellSize/2);
                }
            } else if (flagged[row][col]) {
                // Draw flagged cell
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Draw flag
                ctx.fillStyle = '#FF0000';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🚩', x + cellSize/2, y + cellSize/2);
            } else {
                // Draw unrevealed cell
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(x, y, cellSize, cellSize);
            }
            
            // Draw border
            ctx.strokeStyle = '#808080';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }
}

function drawCursors() {
    const ctx = gameBoard.getContext('2d');
    
    // Redraw board first
    drawBoard();
    
    // Draw other players' cursors
    cursorPositions.forEach((pos, playerId) => {
        if (playerId !== socket.id) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Mouse events for game board
gameBoard.addEventListener('mousemove', (e) => {
    if (!currentRoomCode || !gameState || gameState.gameOver) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    socket.emit('cursor-move', {
        roomCode: currentRoomCode,
        x,
        y
    });
});

gameBoard.addEventListener('click', (e) => {
    if (!gameState || !currentRoomCode || gameState.gameOver) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    // Validate bounds
    if (row < 0 || row >= gameState.height || col < 0 || col >= gameState.width) return;
    
    socket.emit('reveal-cell', {
        roomCode: currentRoomCode,
        row,
        col
    });
});

gameBoard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!gameState || !currentRoomCode || gameState.gameOver) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    // Validate bounds
    if (row < 0 || row >= gameState.height || col < 0 || col >= gameState.width) return;
    
    const currentlyFlagged = gameState.flagged[row][col];
    
    socket.emit('flag-cell', {
        roomCode: currentRoomCode,
        row,
        col,
        flagged: !currentlyFlagged
    });
});
