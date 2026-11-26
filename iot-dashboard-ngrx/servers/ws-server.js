/**
 * WEBSOCKET SERVER - ws-server.js
 *
 * This is a lightweight Node.js server that simulates a factory floor
 * sensor system. In a real application this would be replaced by an
 * actual industrial IoT platform (e.g. Siemens MindSphere, OPC-UA).
 *
 * HOW TO RUN:
 *   node servers/ws-server.js
 *   (Listens on ws://localhost:8080)
 *
 * WHAT IT DOES:
 *   Every 1 second it pushes one SensorReading per machine to ALL
 *   connected WebSocket clients. The Angular app receives these and
 *   processes them through RxJS operator chains.
 *
 * INSTALL DEPENDENCY:
 *   npm install ws --save-dev   (already listed in package.json)
 */

const { WebSocketServer } = require('ws');

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = 8080;
const EMIT_INTERVAL_MS = 1000; // send readings every 1 second

// Machine IDs must match the IDs in servers/db.json
const MACHINE_IDS = [1, 2, 3, 4];

// ─── Helper: generate a realistic-looking sensor reading ─────────────────────

/**
 * Returns a random number between min and max, occasionally spiking
 * above the max to simulate a threshold breach (for alert demos).
 */
function randomReading(min, max, spikeChance = 0.05) {
  const spike = Math.random() < spikeChance;
  if (spike) {
    // spike 10–20% above max
    return max * (1 + 0.1 + Math.random() * 0.1);
  }
  return min + Math.random() * (max - min);
}

/**
 * Builds one SensorReading object for a given machineId.
 * Values are randomised but stay within realistic ranges most of the time.
 */
function generateReading(machineId) {
  return {
    machineId,
    timestamp: Date.now(),
    temperature: parseFloat(randomReading(60, 90).toFixed(1)),  // °C
    pressure:    parseFloat(randomReading(4, 10).toFixed(2)),   // bar
    rpm:         Math.round(randomReading(1500, 3000)),          // RPM
  };
}

// ─── Server setup ─────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });

console.log(`[WS Server] Listening on ws://localhost:${PORT}`);

wss.on('connection', (socket) => {
  console.log('[WS Server] Client connected. Total clients:', wss.clients.size);

  socket.on('close', () => {
    console.log('[WS Server] Client disconnected. Total clients:', wss.clients.size);
  });

  socket.on('error', (err) => {
    console.error('[WS Server] Socket error:', err.message);
  });
});

// ─── Broadcast loop ───────────────────────────────────────────────────────────

/**
 * Every EMIT_INTERVAL_MS milliseconds, generate readings for all machines
 * and broadcast them to every connected client.
 *
 * JSON.stringify converts the object to a string because WebSocket
 * transmits text, not JavaScript objects.
 */
setInterval(() => {
  if (wss.clients.size === 0) return; // no clients — skip

  const readings = MACHINE_IDS.map(generateReading);

  wss.clients.forEach((client) => {
    // ReadyState 1 = OPEN (connected and able to receive data)
    if (client.readyState === 1) {
      client.send(JSON.stringify(readings));
    }
  });
}, EMIT_INTERVAL_MS);
