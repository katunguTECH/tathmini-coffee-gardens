const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// CRITICAL: Get port from Railway, default to 8080
const PORT = process.env.PORT || 8080;

// CRITICAL: Listen on all network interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Railway port: ${PORT}`);
});

// Keep server alive
server.keepAliveTimeout = 61 * 1000;
server.headersTimeout = 65 * 1000;