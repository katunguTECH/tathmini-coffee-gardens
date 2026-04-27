const express = require('express');
const path = require('path');
const app = express();

// IMPORTANT: Serve static files from the current directory
app.use(express.static(__dirname));

// Explicitly handle the root path
app.get('/', (req, res) => {
    console.log('Root path accessed');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint (required by Railway)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Handle all other routes - serve index.html
app.get('*', (req, res) => {
    console.log(`Serving index.html for: ${req.url}`);
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the PORT from Railway environment
const PORT = process.env.PORT || 8080;

// Start server and keep it running
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Tathmini Coffee Gardens app running`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Ready to accept connections`);
    console.log(`📁 Current directory: ${__dirname}`);
    console.log(`📄 index.html exists: ${require('fs').existsSync(path.join(__dirname, 'index.html'))}`);
});