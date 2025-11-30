# Multiplayer Minesweeper

A real-time multiplayer version of the classic Minesweeper game where two players can play together on the same board. Host a game and invite a friend to join for collaborative or competitive gameplay.

## Features

- **Host/Join Game Functionality**: Create a game room as a host or join an existing game with a room code
- **Real-time Multiplayer Gameplay**: Two players can play together on the same Minesweeper board
- **Live Cursor Position Sharing**: See where your friend's cursor is on the board in real-time
- **Synchronized Game State Updates**: All moves, reveals, and flag placements are instantly synchronized between players

## Technology Stack

This project is built as a web-based application using:
- **Frontend**: HTML, CSS, and JavaScript
- **Backend**: WebSocket server for real-time communication
- **Real-time Communication**: WebSockets for instant updates between players

## Basic Usage

1. **Hosting a Game**:
   - Start the application and click "Host Game"
   - You'll receive a unique room code
   - Share this code with your friend

2. **Joining a Game**:
   - Enter the room code provided by the host
   - Click "Join Game" to connect to the game room

3. **Playing Together**:
   - Both players can see each other's cursor positions
   - All clicks, reveals, and flag placements are shared in real-time
   - Work together or compete to clear the minefield!

