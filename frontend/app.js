// Version: 3.0.0 - Added emotes, mine count, copy button, modernized UI, no 50/50s
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
const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
const emoteBtn = document.getElementById('emote-btn');
const emotePicker = document.getElementById('emote-picker');
const minesRemaining = document.getElementById('mines-remaining');

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
    // Connected to server
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
        // Error drawing cursors
    }
});

socket.on('game-initialized', (state) => {
    gameState = state;
    initializeBoard();
    gameStatus.textContent = '';
    gameStatus.className = 'game-status';
    updateMineCount();
});

socket.on('cell-revealed', ({ row, col, value, revealed, board }) => {
    if (!gameState) {
        return;
    }
    
    // Update board if provided
    if (board) {
        gameState.board = board;
    }
    
    // Update revealed array
    if (revealed) {
        gameState.revealed = revealed;
    } else if (row !== undefined && col !== undefined) {
        // Update single cell
        if (!gameState.revealed) {
            gameState.revealed = Array(gameState.height).fill(null).map(() => Array(gameState.width).fill(false));
        }
        gameState.revealed[row][col] = true;
    }
    
    drawBoard();
    drawCursors();
});

socket.on('cell-flagged', ({ row, col, flagged }) => {
    gameState.flagged[row][col] = flagged;
    drawBoard();
    drawCursors();
    updateMineCount();
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
    emotePicker.classList.add('hidden');
});

// Copy room code button
copyRoomCodeBtn.addEventListener('click', async () => {
    const roomCode = roomCodeDisplay.textContent || gameRoomCode.textContent;
    if (roomCode) {
        try {
            await navigator.clipboard.writeText(roomCode);
            copyRoomCodeBtn.textContent = '✓ Copied!';
            copyRoomCodeBtn.classList.add('copy-success');
            setTimeout(() => {
                copyRoomCodeBtn.textContent = '📋 Copy';
                copyRoomCodeBtn.classList.remove('copy-success');
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = roomCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            copyRoomCodeBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                copyRoomCodeBtn.textContent = '📋 Copy';
            }, 2000);
        }
    }
});

// Emote system - improved for easier use
let emoteHoldTimer = null;
let isHolding = false;
let radialMenuVisible = false;
const emoteList = ['😊', '😮', '😱', '🎉', '👍', '👎', '💥', '🔥'];
let currentEmoteIndex = 0;

// Update emote button display
function updateEmoteButton() {
    emoteBtn.textContent = `${emoteList[currentEmoteIndex]} Emotes`;
    // Highlight selected emote in picker
    document.querySelectorAll('.emote-btn').forEach((btn, index) => {
        if (index === currentEmoteIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Emote button (for emote picker)
emoteBtn.addEventListener('click', () => {
    emotePicker.classList.toggle('hidden');
});

// Emote picker buttons - select emote to use
document.querySelectorAll('.emote-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        currentEmoteIndex = index;
        updateEmoteButton();
        emotePicker.classList.add('hidden');
    });
});

// Keyboard shortcuts for quick emote selection (1-8)
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // Don't trigger when typing in inputs
    
    const key = parseInt(e.key);
    if (key >= 1 && key <= 8) {
        currentEmoteIndex = key - 1;
        updateEmoteButton();
        // Quick emote at mouse position if on board
        if (gameState && !gameState.gameOver) {
            const rect = gameBoard.getBoundingClientRect();
            const x = rect.width / 2;
            const y = rect.height / 2;
            sendEmote(x, y);
        }
    }
});

// Initialize emote button
updateEmoteButton();

// Socket handler for receiving emotes
socket.on('emote-received', ({ emote, playerId, x, y }) => {
    if (playerId !== socket.id) {
        showEmoteOnBoard(emote, x, y, false);
    }
});

function showEmoteOnBoard(emote, x, y, isOwn = false) {
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.textContent = emote;
    
    // Position relative to game board
    const boardRect = gameBoard.getBoundingClientRect();
    
    // x and y are already in board coordinates (0 to board width/height)
    // Convert to screen coordinates
    bubble.style.position = 'fixed';
    bubble.style.left = (boardRect.left + x) + 'px';
    bubble.style.top = (boardRect.top + y) + 'px';
    bubble.style.transform = 'translate(-50%, -50%) scale(0)';
    bubble.style.pointerEvents = 'none';
    bubble.style.zIndex = '1000';
    
    // Add player indicator for other players' emotes
    if (!isOwn) {
        bubble.classList.add('other-player-emote');
    }
    
    document.body.appendChild(bubble);
    
    // Animate in with bounce
    requestAnimationFrame(() => {
        bubble.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        bubble.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    setTimeout(() => {
        bubble.style.transition = 'all 0.3s ease-out';
        bubble.style.transform = 'translate(-50%, -50%) scale(1.3) translateY(-80px)';
        bubble.style.opacity = '0';
        setTimeout(() => {
            bubble.remove();
        }, 300);
    }, 1700);
}

// Send emote function
function sendEmote(x, y) {
    if (!currentRoomCode || !gameState || gameState.gameOver) return;
    
    const emote = emoteList[currentEmoteIndex];
    socket.emit('send-emote', {
        roomCode: currentRoomCode,
        emote: emote,
        x: x,
        y: y
    });
    showEmoteOnBoard(emote, x, y, true);
}

// Middle-click or right-click+shift to quick emote
gameBoard.addEventListener('auxclick', (e) => {
    if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        if (!gameState || gameState.gameOver) return;
        
        const rect = gameBoard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x <= gameBoard.width && y >= 0 && y <= gameBoard.height) {
            sendEmote(x, y);
        }
    }
});

// Hold to show radial emote menu
let holdStartX = 0;
let holdStartY = 0;
gameBoard.addEventListener('mousedown', (e) => {
    if (!gameState || gameState.gameOver) return;
    if (e.button !== 0) return; // Only left mouse button
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if within board bounds
    if (x < 0 || x > gameBoard.width || y < 0 || y > gameBoard.height) return;
    
    // Don't trigger if it's a click (will be handled by click handler)
    isHolding = true;
    holdStartX = x;
    holdStartY = y;
    
    emoteHoldTimer = setTimeout(() => {
        if (isHolding && currentRoomCode) {
            showRadialEmoteMenu(x, y, rect);
        }
    }, 300); // Hold for 300ms to show radial menu
});

gameBoard.addEventListener('mouseup', (e) => {
    if (radialMenuVisible) {
        // Radial menu will handle the click
        return;
    }
    
    isHolding = false;
    if (emoteHoldTimer) {
        clearTimeout(emoteHoldTimer);
        emoteHoldTimer = null;
    }
});

gameBoard.addEventListener('mouseleave', () => {
    isHolding = false;
    if (emoteHoldTimer) {
        clearTimeout(emoteHoldTimer);
        emoteHoldTimer = null;
    }
    hideRadialMenu();
});

// Radial emote menu
function showRadialEmoteMenu(x, y, boardRect) {
    radialMenuVisible = true;
    const menu = document.getElementById('radial-emote-menu');
    if (!menu) return;
    
    // Position menu at cursor
    menu.style.left = (boardRect.left + x) + 'px';
    menu.style.top = (boardRect.top + y) + 'px';
    menu.classList.remove('hidden');
    
    // Create emote buttons in radial layout
    menu.innerHTML = '';
    emoteList.forEach((emote, index) => {
        const btn = document.createElement('button');
        btn.className = 'radial-emote-btn';
        if (index === currentEmoteIndex) {
            btn.classList.add('selected');
        }
        btn.textContent = emote;
        btn.addEventListener('click', () => {
            currentEmoteIndex = index;
            updateEmoteButton();
            sendEmote(x, y);
            hideRadialMenu();
        });
        menu.appendChild(btn);
    });
}

function hideRadialMenu() {
    radialMenuVisible = false;
    const menu = document.getElementById('radial-emote-menu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

// Click outside to close radial menu
document.addEventListener('click', (e) => {
    if (radialMenuVisible && !e.target.closest('#radial-emote-menu')) {
        hideRadialMenu();
    }
});

function updateMineCount() {
    if (!gameState) return;
    
    let flaggedCount = 0;
    for (let row = 0; row < gameState.height; row++) {
        for (let col = 0; col < gameState.width; col++) {
            if (gameState.flagged[row][col]) {
                flaggedCount++;
            }
        }
    }
    
    const remaining = gameState.mines - flaggedCount;
    minesRemaining.textContent = remaining;
    
    // Change color if low on mines
    const mineCountEl = document.querySelector('.mine-count');
    if (remaining <= 5 && remaining > 0) {
        mineCountEl.style.color = '#ff6b6b';
        mineCountEl.style.animation = 'pulse 1s infinite';
    } else {
        mineCountEl.style.color = '#dc3545';
        mineCountEl.style.animation = 'none';
    }
}

startGameBtn.addEventListener('click', () => {
    if (!isHost) {
        return;
    }
    
    if (!currentRoomCode) {
        return;
    }
    
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const mines = parseInt(minesInput.value);
    
    // Validate inputs
    if (isNaN(width) || width < 8 || width > 30) {
        alert('Width must be between 8 and 30');
        return;
    }
    
    if (isNaN(height) || height < 8 || height > 30) {
        alert('Height must be between 8 and 30');
        return;
    }
    
    if (isNaN(mines) || mines < 10) {
        alert('Mines must be at least 10');
        return;
    }
    
    const maxMines = Math.floor(width * height * 0.8); // Max 80% of cells can be mines
    if (mines > maxMines) {
        alert(`Too many mines! Maximum is ${maxMines} for a ${width}x${height} board.`);
        return;
    }
    
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
    updateGameControlsVisibility();
}

function updateGameControlsVisibility() {
    const gameControls = document.querySelector('.game-controls');
    if (!gameControls) {
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
}

function switchToLobbyScreen() {
    gameScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    roomInfo.classList.add('hidden');
    joinForm.classList.add('hidden');
}

function initializeBoard() {
    if (!gameState) {
        return;
    }
    
    const width = gameState.width;
    const height = gameState.height;
    
    if (!width || !height) {
        return;
    }
    
    gameBoard.width = width * cellSize;
    gameBoard.height = height * cellSize;
    
    // Ensure canvas is visible and clickable
    gameBoard.style.display = 'block';
    gameBoard.style.pointerEvents = 'auto';
    
    drawBoard();
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
    // Don't click if radial menu is visible or if we just held
    if (radialMenuVisible || emoteHoldTimer !== null) {
        if (emoteHoldTimer) {
            clearTimeout(emoteHoldTimer);
            emoteHoldTimer = null;
        }
        isHolding = false;
        return;
    }
    
    if (!gameState || !currentRoomCode || gameState.gameOver) return;
    if (!gameState.width || !gameState.height) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    // Validate bounds
    if (row < 0 || row >= gameState.height || col < 0 || col >= gameState.width) {
        return;
    }
    
    socket.emit('reveal-cell', {
        roomCode: currentRoomCode,
        row,
        col
    });
});

gameBoard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!gameState || !currentRoomCode || gameState.gameOver) return;
    if (!gameState.width || !gameState.height) return;
    
    const rect = gameBoard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    // Validate bounds
    if (row < 0 || row >= gameState.height || col < 0 || col >= gameState.width) {
        return;
    }
    
    const currentlyFlagged = gameState.flagged[row][col];
    
    socket.emit('flag-cell', {
        roomCode: currentRoomCode,
        row,
        col,
        flagged: !currentlyFlagged
    });
});
