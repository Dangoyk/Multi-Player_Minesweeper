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

### Step 1: Deploy Backend to Railway

1. **Create a Railway account** at [railway.app](https://railway.app) and sign in

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure the service**:
   - Railway should auto-detect it's a Node.js project
   - **Important**: In Railway settings, set the **Root Directory** to `backend`
   - This tells Railway to treat the `backend` folder as the project root
   - Railway will automatically run `npm install` and `npm start` in the backend folder

4. **Add environment variables** in Railway:
   - Go to your service → Variables tab
   - Add `FRONTEND_URL` (you'll set this after deploying frontend)
     - For now, you can use a placeholder like `https://placeholder.vercel.app`
   - `PORT` is automatically set by Railway (don't set it manually)

5. **Get your Railway URL**:
   - After deployment, Railway will give you a URL like `https://your-app.railway.app`
   - Copy this URL - you'll need it for the frontend
   - **Important**: Make sure to use `https://` not `http://`

### Step 2: Deploy Frontend to Vercel

#### Option A: Using Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Set environment variable**:
   ```bash
   vercel env add WS_SERVER_URL
   ```
   When prompted:
   - Enter your Railway backend URL (e.g., `https://your-app.railway.app`)
   - Select "Production", "Preview", and "Development" environments

4. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```
   Or link your project first:
   ```bash
   vercel link
   vercel --prod
   ```

#### Option B: Using Vercel Dashboard (Recommended)

1. **Push your code to GitHub** (if not already done)

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

3. **Import your repository**:
   - Click "Add New Project"
   - Select your repository
   - Click "Import"

4. **Configure the project**:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as is (or set to project root)
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `frontend`

5. **Add environment variable**:
   - Go to Settings → Environment Variables
   - Add `WS_SERVER_URL` with your Railway backend URL (e.g., `https://your-app.railway.app`)
   - Select all environments (Production, Preview, Development)

6. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your frontend

7. **Get your Vercel URL**:
   - After deployment, you'll get a URL like `https://your-app.vercel.app`
   - Copy this URL

8. **Update Railway environment variable**:
   - Go back to Railway
   - Update `FRONTEND_URL` to your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Railway will automatically redeploy with the new URL

### Step 3: Test Your Deployment

1. **Open your Vercel URL** in a browser
2. **Host a game** and share the room code
3. **Open another browser/device** and join with the room code
4. **Test the game** - both players should be able to see each other's cursors and play together

### Troubleshooting

- **WebSocket connection fails**: Make sure `WS_SERVER_URL` in Vercel matches your Railway URL exactly (including `https://`)
- **CORS errors**: Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- **Build fails**: Check that `build.js` has Node.js available (Vercel provides it automatically)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: Leave as root (or set to project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend`
5. Add environment variable:
   - Go to Settings → Environment Variables
   - Add `WS_SERVER_URL` with your Railway backend URL
6. Deploy!

### Important Notes

- The build script (`build.js`) automatically injects the `WS_SERVER_URL` environment variable into the HTML
- Make sure your Railway backend URL doesn't have a trailing slash
- Both services need to be deployed for the game to work
- Railway may take a few minutes to deploy on first run

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

