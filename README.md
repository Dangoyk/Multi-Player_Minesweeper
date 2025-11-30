# Multiplayer Minesweeper

A real-time multiplayer version of the classic Minesweeper game where two players can play together on the same board. Host a game and invite a friend to join for collaborative or competitive gameplay.

## Features

- **Host/Join Game Functionality**: Create a game room as a host or join an existing game with a room code
- **Real-time Multiplayer Gameplay**: Two players can play together on the same Minesweeper board
- **Live Cursor Position Sharing**: See where your friend's cursor is on the board in real-time
- **Synchronized Game State Updates**: All moves, reveals, and flag placements are instantly synchronized between players

## Technology Stack

This project is built as a web-based application using:
- **Frontend**: HTML, CSS, and JavaScript (deployed on Vercel)
- **Backend**: Node.js with Express and Socket.io (deployed on Railway)
- **Real-time Communication**: WebSockets for instant updates between players

## Project Structure

```
multiplayerminesweeper/
├── frontend/          # Frontend code for Vercel
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── env.example
├── backend/           # Backend WebSocket server for Railway
│   ├── server.js
│   ├── package.json
│   └── env.example
├── vercel.json        # Vercel deployment config
├── railway.json       # Railway deployment config
└── README.md
```

## Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `env.example`):
   ```bash
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

   The WebSocket server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory (or serve from root):
   ```bash
   # Using a simple HTTP server (Python)
   python -m http.server 3000
   
   # Or using Node.js http-server
   npx http-server frontend -p 3000
   ```

2. Update the WebSocket URL in `frontend/app.js` if needed:
   ```javascript
   const WS_SERVER_URL = 'http://localhost:3001';
   ```

3. Open `http://localhost:3000` in your browser

## Deployment

### Deploy Backend to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables:
   - `PORT`: Railway will set this automatically
   - `FRONTEND_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
4. Railway will automatically detect the `railway.json` config and deploy

### Deploy Frontend to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```
   When prompted, set the root directory to `frontend` or configure it in `vercel.json`

3. **Important**: After deployment, you need to manually update the WebSocket URL:
   - Go to your Vercel project settings
   - Edit `frontend/index.html` and replace the `window.__WS_SERVER_URL__` value with your Railway backend URL
   - Or use Vercel's environment variables with a build script to inject it
   
   For now, you can manually edit `frontend/index.html` line with:
   ```javascript
   window.__WS_SERVER_URL__ = 'https://your-railway-app.railway.app';
   ```
   
   Then redeploy.

**Note**: For production, consider using a build step to inject environment variables automatically.

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

