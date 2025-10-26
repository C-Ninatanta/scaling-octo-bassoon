//This is for the merged one, just to deploy one server
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// Allow CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

const BOUNDARY = '--frame';

// Storage & client lists for cam1 and cam2
let latestFrameBuffer1 = null;
let latestFrameBuffer2 = null;
const mjpegClients1 = [];
const mjpegClients2 = [];

// MJPEG endpoint cam1
app.get('/video_feed/cam1', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=' + BOUNDARY,
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'Pragma': 'no-cache'
  });
  mjpegClients1.push(res);
  req.on('close', () => {
    const idx = mjpegClients1.indexOf(res);
    if (idx !== -1) mjpegClients1.splice(idx, 1);
  });
});

// MJPEG endpoint cam2
app.get('/video_feed/cam2', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=' + BOUNDARY,
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'Pragma': 'no-cache'
  });
  mjpegClients2.push(res);
  req.on('close', () => {
    const idx = mjpegClients2.indexOf(res);
    if (idx !== -1) mjpegClients2.splice(idx, 1);
  });
});

// Ping route
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Create two WebSocket.Server instances without listening directly
const wss1 = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });

// Handle websocket for cam1
wss1.on('connection', (ws) => {
  console.log('WebSocket client connected (cam1)');
  ws.on('message', (message) => {
    const base64Data = message.toString().replace(/^data:image\/jpeg;base64,/, '');
    const frameBuffer = Buffer.from(base64Data, 'base64');
    latestFrameBuffer1 = frameBuffer;
    mjpegClients1.forEach((res) => {
      try {
        res.write(`${BOUNDARY}\r\n`);
        res.write('Content-Type: image/jpeg\r\n\r\n');
        res.write(frameBuffer);
        res.write('\r\n');
      } catch (err) { /* ignore */ }
    });
  });
  ws.on('close', () => {
    console.log('WebSocket client disconnected (cam1)');
  });
});

// Handle websocket for cam2
wss2.on('connection', (ws) => {
  console.log('WebSocket client connected (cam2)');
  ws.on('message', (message) => {
    const base64Data = message.toString().replace(/^data:image\/jpeg;base64,/, '');
    const frameBuffer = Buffer.from(base64Data, 'base64');
    latestFrameBuffer2 = frameBuffer;
    mjpegClients2.forEach((res) => {
      try {
        res.write(`${BOUNDARY}\r\n`);
        res.write('Content-Type: image/jpeg\r\n\r\n');
        res.write(frameBuffer);
        res.write('\r\n');
      } catch (err) { /* ignore */ }
    });
  });
  ws.on('close', () => {
    console.log('WebSocket client disconnected (cam2)');
  });
});

// Route WebSocket upgrade requests based on URL
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws/cam1') {
    wss1.handleUpgrade(req, socket, head, (ws) => {
      wss1.emit('connection', ws, req);
    });
  } else if (req.url === '/ws/cam2') {
    wss2.handleUpgrade(req, socket, head, (ws) => {
      wss2.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// Listen on Render-assigned port
const PORT = process.env.PORT;
if (!PORT) throw new Error("PORT environment variable is not set");
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
