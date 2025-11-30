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

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
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
});

socket.on('cell-revealed', ({ row, col, playerId }) => {
    // Handle cell reveal
    revealCell(row, col);
});

socket.on('cell-flagged', ({ row, col, flagged, playerId }) => {
    // Handle cell flag
    flagCell(row, col, flagged);
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
    const ctx = gameBoard.getContext('2d');
    const width = gameState.width;
    const height = gameState.height;
    
    ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);
    
    // Draw grid
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            
            // Draw cell background
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(x, y, cellSize, cellSize);
            
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

function revealCell(row, col) {
    // TODO: Implement cell reveal logic
    console.log('Revealing cell:', row, col);
}

function flagCell(row, col, flagged) {
    // TODO: Implement flag logic
    console.log('Flagging cell:', row, col, flagged);
}

// Mouse events for game board
gameBoard.addEventListener('mousemove', (e) => {
    if (!currentRoomCode) return;
    
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
    if (!gameState || !currentRoomCode) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    socket.emit('reveal-cell', {
        roomCode: currentRoomCode,
        row,
        col
    });
});

gameBoard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!gameState || !currentRoomCode) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    socket.emit('flag-cell', {
        roomCode: currentRoomCode,
        row,
        col,
        flagged: true
    });
});

