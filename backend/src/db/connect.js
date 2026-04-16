const mongoose = require('mongoose');
const { MONGO_URL, DB_NAME } = require('../config/env');

function connect(onOpen) {
  mongoose.connect(`${MONGO_URL}/${DB_NAME}`);
  const db = mongoose.connection;
  db.on('error', (err) => console.error('MongoDB error:', err));
  db.once('open', () => {
    console.log('MongoDB connected');
    if (typeof onOpen === 'function') onOpen();
  });
}

module.exports = { connect };
