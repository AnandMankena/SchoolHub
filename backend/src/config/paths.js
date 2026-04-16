const path = require('path');

/** backend/src/config → repo root (SchoolHub) */
const repoRoot = path.join(__dirname, '..', '..', '..');
const backendRoot = path.join(__dirname, '..', '..');

module.exports = {
  repoRoot,
  backendRoot,
  memoryDir: path.join(repoRoot, 'memory'),
};
