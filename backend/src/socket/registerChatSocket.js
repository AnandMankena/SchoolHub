const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { JWT_SECRET } = require('../config/env');
const { User, ChatMessage, ChatGroup } = require('../models');
const { now } = require('../utils/mongo');

function registerChatSocket(io) {
  const sidUserMap = {};

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ id: payload.sub }).select('-_id -__v -password_hash').lean();
        if (user) {
          sidUserMap[socket.id] = user;
          console.log(`Socket connected: ${user.name} (${socket.id})`);
        }
      } catch (e) { console.error('Socket auth error:', e.message); }
    }

    socket.on('join_group', (data) => {
      const groupId = typeof data === 'string' ? data : data?.group_id;
      if (groupId) { socket.join(groupId); console.log(`Socket ${socket.id} joined room ${groupId}`); }
    });

    socket.on('send_message', async (data) => {
      const user = sidUserMap[socket.id];
      if (!user || !data?.group_id || !data?.message) return;
      const group = await ChatGroup.findOne({ id: data.group_id }).select('members').lean();
      if (!group || !(group.members || []).includes(user.id)) return;
      const msg = { id: randomUUID(), group_id: data.group_id, sender_id: user.id, sender_name: user.name, message: data.message, created_at: now() };
      await ChatMessage.create(msg);
      io.to(data.group_id).emit('new_message', msg);
    });

    socket.on('leave_group', (data) => {
      const groupId = typeof data === 'string' ? data : data?.group_id;
      if (groupId) socket.leave(groupId);
    });

    socket.on('disconnect', () => {
      delete sidUserMap[socket.id];
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { registerChatSocket };
