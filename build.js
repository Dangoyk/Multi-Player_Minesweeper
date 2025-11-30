// Simple build script to inject WebSocket URL for Vercel deployment
const fs = require('fs');
const path = require('path');

// Get WebSocket URL from environment variable (set in Vercel)
// Falls back to localhost for local development
const wsServerUrl = process.env.WS_SERVER_URL || process.env.VITE_WS_SERVER_URL || 'http://localhost:3001';
const configPath = path.join(__dirname, 'frontend', 'config.js');

const configContent = `// Configuration file - auto-generated during build
// WebSocket server URL: ${wsServerUrl}
// This file is generated automatically - do not edit manually
window.__WS_SERVER_URL__ = '${wsServerUrl}';
`;

fs.writeFileSync(configPath, configContent);
console.log(`✅ Config file updated with WebSocket URL: ${wsServerUrl}`);
