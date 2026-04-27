const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Specifically handle root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Tathmini Coffee Gardens is LIVE!`);
    console.log(`📍 Port: ${port}`);
    console.log(`🌍 Visit: http://localhost:${port}`);
});