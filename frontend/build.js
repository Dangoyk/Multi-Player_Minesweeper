// Build script to inject WebSocket URL from environment variable
const fs = require('fs');
const path = require('path');

const wsServerUrl = process.env.VITE_WS_SERVER_URL || process.env.WS_SERVER_URL || 'http://localhost:3001';

// Read index.html
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace the WebSocket URL
html = html.replace(
    /window\.__WS_SERVER_URL__ = ['"][^'"]*['"]/,
    `window.__WS_SERVER_URL__ = '${wsServerUrl}'`
);

// Write back
fs.writeFileSync(indexPath, html);
console.log(`Injected WebSocket URL: ${wsServerUrl}`);

