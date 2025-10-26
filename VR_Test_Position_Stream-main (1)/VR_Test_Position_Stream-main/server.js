//with no port codes
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

// Optional ping endpoint for Render health checks
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Create an HTTP server
const server = http.createServer(app);

// Attach WebSocket server to HTTP server
const wss = new WebSocket.Server({ server });

let vrClient = null;
let robotClient = null;

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established.');

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (err) {
      console.warn('Received non-JSON message, ignoring.');
      return;
    }

    if (msg.type === 'identify') {
      if (msg.role === 'vr') {
        vrClient = ws;
        ws.role = 'vr';
        console.log('VR client identified.');
        ws.send(JSON.stringify({ type: 'identified', role: 'vr' }));
      } else if (msg.role === 'robot') {
        robotClient = ws;
        ws.role = 'robot';
        console.log('Robot client identified.');
        ws.send(JSON.stringify({ type: 'identified', role: 'robot' }));
      } else {
        console.warn('Unknown role in identify:', msg.role);
      }
      return;
    }

    if (msg.type === 'vr_command') {
      if (robotClient && robotClient.readyState === WebSocket.OPEN) {
        robotClient.send(JSON.stringify(msg));
      } else {
        console.warn('No robot client connected; cannot forward VR command.');
      }
    } else if (msg.type === 'robot_status') {
      if (vrClient && vrClient.readyState === WebSocket.OPEN) {
        vrClient.send(JSON.stringify(msg));
      } else {
        console.warn('No VR client connected; cannot forward robot status.');
      }
    } else {
      console.warn('Unknown message type:', msg.type);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed.');
    if (ws === vrClient) {
      vrClient = null;
      console.log('VR client disconnected.');
    }
    if (ws === robotClient) {
      robotClient = null;
      console.log('Robot client disconnected.');
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Optional: ping clients to detect dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Terminating dead connection.');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Start the server on the port provided by Render (no fallback)
const PORT = process.env.PORT;
if (!PORT) throw new Error("PORT environment variable is not set");

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});


// 
// 
// 
// 
// 
// // with port
// // index.js
// const WebSocket = require('ws');

// // Create a WebSocket server listening on the port Render provides (process.env.PORT) or 8080 locally
// const PORT = process.env.PORT || 8080;
// const wss = new WebSocket.Server({ port: PORT });
// console.log(`WebSocket relay server listening on port ${PORT}`);

// // const PORT = process.env.PORT;
// // if (!PORT) throw new Error("PORT environment variable is not set");

// // server.listen(PORT, () => {
// //   console.log(`Listening on port ${PORT}`);
// // });

// // We keep track of one VR client and one Robot client (you can extend to multiple if needed)
// let vrClient = null;
// let robotClient = null;

// wss.on('connection', (ws) => {
//   console.log('New WebSocket connection established.');

//   // Each client must send an "identify" message first, e.g. { type: "identify", role: "vr" }
//   ws.isAlive = true;
//   ws.on('pong', () => { ws.isAlive = true; });

//   ws.on('message', (data) => {
//     let msg;
//     try {
//       msg = JSON.parse(data);
//     } catch (err) {
//       console.warn('Received non-JSON message, ignoring.');
//       return;
//     }

//     // Identification step
//     if (msg.type === 'identify') {
//       if (msg.role === 'vr') {
//         vrClient = ws;
//         ws.role = 'vr';
//         console.log('VR client identified.');
//         ws.send(JSON.stringify({ type: 'identified', role: 'vr' }));
//       } else if (msg.role === 'robot') {
//         robotClient = ws;
//         ws.role = 'robot';
//         console.log('Robot client identified.');
//         ws.send(JSON.stringify({ type: 'identified', role: 'robot' }));
//       } else {
//         console.warn('Unknown role in identify:', msg.role);
//       }
//       return;
//     }

//     // After identification, handle messages
//     if (msg.type === 'vr_command') {
//       // Forward to robot if connected
//       if (robotClient && robotClient.readyState === WebSocket.OPEN) {
//         robotClient.send(JSON.stringify(msg));
//       } else {
//         console.warn('No robot client connected; cannot forward VR command.');
//       }
//     } else if (msg.type === 'robot_status') {
//       // Forward to VR client if connected
//       if (vrClient && vrClient.readyState === WebSocket.OPEN) {
//         vrClient.send(JSON.stringify(msg));
//       } else {
//         console.warn('No VR client connected; cannot forward robot status.');
//       }
//     } else {
//       console.warn('Unknown message type:', msg.type);
//     }
//   });

//   ws.on('close', () => {
//     console.log('WebSocket connection closed.');
//     if (ws === vrClient) {
//       vrClient = null;
//       console.log('VR client disconnected.');
//     }
//     if (ws === robotClient) {
//       robotClient = null;
//       console.log('Robot client disconnected.');
//     }
//   });

//   ws.on('error', (err) => {
//     console.error('WebSocket error:', err);
//   });
// });

// // Optional: ping clients to detect dead connections
// const interval = setInterval(() => {
//   wss.clients.forEach((ws) => {
//     if (!ws.isAlive) {
//       console.log('Terminating dead connection.');
//       return ws.terminate();
//     }
//     ws.isAlive = false;
//     ws.ping(() => {});
//   });
// }, 30000);

// wss.on('close', () => {
//   clearInterval(interval);
// });




