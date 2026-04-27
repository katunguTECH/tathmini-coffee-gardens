const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(__dirname));

// Health check endpoint (required by Railway)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Handle all routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the PORT from Railway environment
const PORT = process.env.PORT || 8080;

// Start server and keep it running
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Tathmini Coffee Gardens app running`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Ready to accept connections`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});