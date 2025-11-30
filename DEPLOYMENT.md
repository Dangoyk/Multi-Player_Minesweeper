# Deployment Guide

Quick guide to deploy Multiplayer Minesweeper to production.

## Prerequisites

- GitHub account
- Railway account (free tier available)
- Vercel account (free tier available)

## Quick Deployment Steps

### 1. Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and deploy
5. Go to **Variables** tab and add:
   - `FRONTEND_URL` = `https://placeholder.vercel.app` (we'll update this later)
6. Copy your Railway URL (e.g., `https://your-app.railway.app`)

### 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project" → Import your repository
3. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `frontend`
4. Go to **Settings** → **Environment Variables**
5. Add `WS_SERVER_URL` = Your Railway URL (e.g., `https://your-app.railway.app`)
6. Click "Deploy"
7. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

### 3. Update Railway with Vercel URL

1. Go back to Railway
2. Update `FRONTEND_URL` variable to your Vercel URL
3. Railway will automatically redeploy

### 4. Test

1. Open your Vercel URL
2. Host a game and test with two browsers/devices
3. Both players should see cursors and be able to play together!

## Environment Variables Summary

### Railway (Backend)
- `FRONTEND_URL` - Your Vercel frontend URL
- `PORT` - Automatically set by Railway (don't set manually)

### Vercel (Frontend)
- `WS_SERVER_URL` - Your Railway backend URL

## Troubleshooting

**WebSocket connection fails:**
- Check that `WS_SERVER_URL` in Vercel matches Railway URL exactly
- Make sure both URLs use `https://` (not `http://`)

**CORS errors:**
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly

**Build fails:**
- Make sure `WS_SERVER_URL` is set in Vercel environment variables
- Check Vercel build logs for errors

