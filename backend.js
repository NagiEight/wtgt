const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3000 });

const clients = new Set();

server.on('connection', (ws) => {
  clients.add(ws);

  ws.on('message', (message) => {
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

console.log('WebSocket server running on ws://localhost:3000');
