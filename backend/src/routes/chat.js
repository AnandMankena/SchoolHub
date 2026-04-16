const express = require('express');
const { randomUUID } = require('crypto');
const { ChatGroup, ChatMessage, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');

const router = express.Router();

function staffRole(role) {
  return role === 'principal' || role === 'teacher';
}

/** Sorted pair id so A|B and B|A share one DM thread */
function directPairKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(':');
}

router.get('/groups', authenticate, async (req, res) => {
  try {
    const groups = await ChatGroup.find({ members: req.user.id }).select('-_id -__v').lean();
    for (const g of groups) {
      const lastMsg = await ChatMessage.find({ group_id: g.id }).select('-_id -__v').sort({ created_at: -1 }).limit(1).lean();
      g.last_message = lastMsg[0] || null;
      g.member_count = (g.members || []).length;
      if (g.kind === 'direct' && (g.members || []).length === 2) {
        const otherId = g.members.find((m) => m !== req.user.id);
        const other = otherId ? await User.findOne({ id: otherId }).select('name').lean() : null;
        g.chat_title = other?.name || g.name || 'Direct message';
      } else {
        g.chat_title = g.name;
      }
    }
    res.json({ groups });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

/**
 * Get or create a 1:1 chat between the current user and another staff member (principal/teacher).
 */
router.post('/dm', authenticate, async (req, res) => {
  try {
    const peerId = typeof req.body?.user_id === 'string' ? req.body.user_id.trim() : '';
    if (!peerId || peerId === req.user.id) {
      return res.status(400).json({ detail: 'Invalid user' });
    }
    if (!staffRole(req.user.role)) {
      return res.status(403).json({ detail: 'Direct messages are only for principal and teacher accounts' });
    }
    if (req.user.role === 'teacher' && !req.user.is_approved) {
      return res.status(403).json({ detail: 'Your account must be approved to use direct messages' });
    }
    const peer = await User.findOne({ id: peerId }).select('-_id -__v -password_hash').lean();
    if (!peer) return res.status(404).json({ detail: 'User not found' });
    if (!staffRole(peer.role)) {
      return res.status(403).json({ detail: 'You can only message principal or teacher accounts' });
    }
    if (peer.role === 'teacher' && !peer.is_approved) {
      return res.status(403).json({ detail: 'That teacher is not approved yet' });
    }
    const direct_pair_key = directPairKey(req.user.id, peer.id);
    let group = await ChatGroup.findOne({ direct_pair_key }).lean();
    if (!group) {
      const doc = await ChatGroup.create({
        id: randomUUID(),
        name: peer.name || 'Direct message',
        kind: 'direct',
        direct_pair_key,
        created_by: req.user.id,
        members: [req.user.id, peer.id].sort(),
        created_at: now(),
      });
      group = doc.toObject();
    }
    res.json({ group: clean(group) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/groups', authenticate, async (req, res) => {
  try {
    const members = [...new Set([req.user.id, ...(req.body.member_ids || [])])];
    const group = await ChatGroup.create({ id: randomUUID(), name: req.body.name, created_by: req.user.id, members, created_at: now() });
    res.json({ group: clean(group) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/groups/:groupId', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId }).select('-_id -__v').lean();
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    if (!(group.members || []).includes(req.user.id)) {
      return res.status(403).json({ detail: 'You are not a member of this group' });
    }
    const membersData = [];
    for (const mid of group.members || []) {
      const u = await User.findOne({ id: mid }).select('-_id -__v -password_hash').lean();
      if (u) membersData.push(u);
    }
    group.members_data = membersData;
    res.json({ group });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/groups/:groupId/members', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId });
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    if (!group.members.includes(req.user.id)) return res.status(403).json({ detail: 'You are not a member of this group' });
    await ChatGroup.updateOne({ id: req.params.groupId }, { $addToSet: { members: { $each: req.body.member_ids } } });
    res.json({ message: 'Members added' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/groups/:groupId/messages', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId }).select('members').lean();
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    if (!(group.members || []).includes(req.user.id)) {
      return res.status(403).json({ detail: 'You are not a member of this group' });
    }
    const limit = parseInt(req.query.limit, 10) || 50;
    const messages = await ChatMessage.find({ group_id: req.params.groupId }).select('-_id -__v').sort({ created_at: -1 }).limit(limit).lean();
    messages.reverse();
    res.json({ messages });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/groups/:groupId/messages', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId });
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    if (!(group.members || []).includes(req.user.id)) {
      return res.status(403).json({ detail: 'You are not a member of this group' });
    }
    const msg = { id: randomUUID(), group_id: req.params.groupId, sender_id: req.user.id, sender_name: req.user.name, message: req.body.message, created_at: now() };
    await ChatMessage.create(msg);
    const io = req.app.get('io');
    if (io) io.to(req.params.groupId).emit('new_message', msg);
    res.json({ message: msg });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
