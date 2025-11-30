// Version: 2.0.4 - Enhanced null checks and fixed guest controls
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
    console.log('Connected to server (Version 2.0.4)');
});

socket.on('room-created', ({ roomCode }) => {
    currentRoomCode = roomCode;
    isHost = true;
    roomCodeDisplay.textContent = roomCode;
    gameRoomCode.textContent = roomCode;
    roomInfo.classList.remove('hidden');
    waitingMessage.classList.remove('hidden');
    readyMessage.classList.add('hidden');
    playerCount.textContent = 'Players: 1/2';
    // Host can go to game screen to set up game
    switchToGameScreen();
    updateGameControlsVisibility();
});

socket.on('player-joined', ({ playerId }) => {
    playerCount.textContent = 'Players: 2/2';
    waitingMessage.classList.add('hidden');
    readyMessage.classList.remove('hidden');
    // Update game controls visibility
    updateGameControlsVisibility();
});

socket.on('joined-room', ({ roomCode, isHost: hostStatus }) => {
    currentRoomCode = roomCode;
    isHost = hostStatus;
    gameRoomCode.textContent = roomCode;
    switchToGameScreen();
    playerCount.textContent = 'Players: 2/2';
    // Force update controls visibility immediately
    setTimeout(() => {
        updateGameControlsVisibility();
    }, 0);
    // Also update after a short delay to ensure DOM is ready
    setTimeout(() => {
        updateGameControlsVisibility();
    }, 100);
});

socket.on('join-error', ({ message }) => {
    alert(message);
});


socket.on('player-left', ({ playerId }) => {
    playerCount.textContent = 'Players: 1/2';
    waitingMessage.classList.remove('hidden');
    readyMessage.classList.add('hidden');
});

socket.on('cursor-update', ({ playerId, x, y }) => {
    cursorPositions.set(playerId, { x, y });
    // Only draw cursors if game is fully initialized
    try {
        if (gameState && typeof gameState.width === 'number' && typeof gameState.height === 'number' && gameState.width > 0 && gameState.height > 0) {
            drawCursors();
        }
    } catch (e) {
        console.error('Error drawing cursors:', e);
    }
});

socket.on('game-initialized', (state) => {
    console.log('Game initialized:', state);
    gameState = state;
    console.log('GameState after init:', {
        width: gameState.width,
        height: gameState.height,
        mines: gameState.mines,
        hasBoard: !!gameState.board,
        hasRevealed: !!gameState.revealed,
        hasFlagged: !!gameState.flagged
    });
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
    if (!isHost) {
        console.log('Only host can start the game');
        return;
    }
    
    if (!currentRoomCode) {
        console.log('No room code');
        return;
    }
    
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const mines = parseInt(minesInput.value);
    
    if (mines >= width * height) {
        alert('Too many mines for the board size!');
        return;
    }
    
    console.log('Starting game with:', { roomCode: currentRoomCode, width, height, mines });
    
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
    updateGameControlsVisibility();
}

function updateGameControlsVisibility() {
    const gameControls = document.querySelector('.game-controls');
    if (!gameControls) {
        console.warn('Game controls element not found');
        return;
    }
    
    if (isHost) {
        gameControls.style.display = 'flex';
        gameControls.classList.remove('hidden');
        if (startGameBtn) {
            startGameBtn.disabled = false;
            startGameBtn.style.display = 'inline-block';
        }
    } else {
        gameControls.style.display = 'none';
        gameControls.classList.add('hidden');
        if (startGameBtn) {
            startGameBtn.disabled = true;
            startGameBtn.style.display = 'none';
        }
    }
    console.log('Game controls visibility updated. isHost:', isHost, 'display:', gameControls.style.display);
}

function switchToLobbyScreen() {
    gameScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    roomInfo.classList.add('hidden');
    joinForm.classList.add('hidden');
}

function initializeBoard() {
    if (!gameState) {
        console.log('initializeBoard: No gameState');
        return;
    }
    
    const width = gameState.width;
    const height = gameState.height;
    
    if (!width || !height) {
        console.log('initializeBoard: Invalid dimensions', { width, height });
        return;
    }
    
    console.log('Initializing board:', { width, height, cellSize, canvasWidth: width * cellSize, canvasHeight: height * cellSize });
    
    gameBoard.width = width * cellSize;
    gameBoard.height = height * cellSize;
    
    // Ensure canvas is visible and clickable
    gameBoard.style.display = 'block';
    gameBoard.style.pointerEvents = 'auto';
    
    drawBoard();
    console.log('Board initialized, canvas size:', gameBoard.width, 'x', gameBoard.height);
}

function drawBoard() {
    // No game state yet, don't draw anything
    if (!gameState) {
        return;
    }
    
    // Make sure width and height exist - defensive check
    const width = gameState?.width;
    const height = gameState?.height;
    if (!width || !height) {
        return;
    }
    
    if (!gameState.board) {
        // Draw empty board before first click
        const ctx = gameBoard.getContext('2d');
        
        // Make sure canvas is sized
        if (gameBoard.width === 0 || gameBoard.height === 0) {
            gameBoard.width = width * cellSize;
            gameBoard.height = height * cellSize;
        }
        
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
    
    // Additional defensive check before accessing board properties
    if (!gameState.board || !gameState.revealed || !gameState.flagged) {
        return;
    }
    
    const ctx = gameBoard.getContext('2d');
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
    // Don't draw if no game state or board not initialized - defensive checks
    if (!gameState) return;
    if (typeof gameState.width !== 'number' || typeof gameState.height !== 'number') return;
    if (gameState.width <= 0 || gameState.height <= 0) return;
    
    try {
        const ctx = gameBoard.getContext('2d');
        
        // Redraw board first
        drawBoard();
        
        // Draw other players' cursors
        cursorPositions.forEach((pos, playerId) => {
            if (playerId !== socket.id && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    } catch (e) {
        console.error('Error in drawCursors:', e);
    }
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
    console.log('Click detected on board');
    if (!gameState) {
        console.log('No gameState');
        return;
    }
    if (!currentRoomCode) {
        console.log('No room code');
        return;
    }
    if (gameState.gameOver) {
        console.log('Game is over');
        return;
    }
    if (!gameState.width || !gameState.height) {
        console.log('Game not initialized - width:', gameState.width, 'height:', gameState.height);
        return;
    }
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    console.log('Click at:', { x, y, row, col, width: gameState.width, height: gameState.height });
    
    // Validate bounds
    if (row < 0 || row >= gameState.height || col < 0 || col >= gameState.width) {
        console.log('Click out of bounds');
        return;
    }
    
    console.log('Emitting reveal-cell:', { roomCode: currentRoomCode, row, col });
    socket.emit('reveal-cell', {
        roomCode: currentRoomCode,
        row,
        col
    });
});

gameBoard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log('Right-click detected on board');
    if (!gameState) {
        console.log('No gameState');
        return;
    }
    if (!currentRoomCode) {
        console.log('No room code');
        return;
    }
    if (gameState.gameOver) {
        console.log('Game is over');
        return;
    }
    if (!gameState.width || !gameState.height) {
        console.log('Game not initialized');
        return;
    }
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    // Validate bounds
    if (row < 0 || row >= gameState.height || col < 0 || col >= gameState.width) {
        console.log('Right-click out of bounds');
        return;
    }
    
    const currentlyFlagged = gameState.flagged[row][col];
    
    console.log('Emitting flag-cell:', { roomCode: currentRoomCode, row, col, flagged: !currentlyFlagged });
    socket.emit('flag-cell', {
        roomCode: currentRoomCode,
        row,
        col,
        flagged: !currentlyFlagged
    });
});
