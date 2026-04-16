require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { PORT } = require('./src/config/env');
const { connect } = require('./src/db/connect');
const { createApp } = require('./src/app');
const { registerChatSocket } = require('./src/socket/registerChatSocket');
const { seedData } = require('./src/services/seed/seedData');

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, path: '/api/socket.io' });

app.set('io', io);
registerChatSocket(io);

connect(() => {
  seedData();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SchoolHub API listening on http://0.0.0.0:${PORT}`);
  console.log(`  backend root: ${require('path').join(__dirname)}`);
  console.log('  Modular layout: backend/src/{config,db,models,middleware,routes,services,socket}');
  console.log('  Endpoints: GET /api/health, GET /api/analytics, GET /api/teachers/my-class-analytics, …');
});
