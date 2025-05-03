// backend/routes/members.js
const express = require('express');
const axios = require('axios');
const GuildMember = require('../models/GuildMember');
const auth = require('./authMiddleware');

const router = express.Router();
const {
  BNET_CLIENT_ID, BNET_CLIENT_SECRET,
  GUILD_NAME, GUILD_REALM, REGION
} = process.env;

// Helper: Blizzard OAuth-Token holen
async function fetchBnetToken() {
  const resp = await axios.post(
    `https://${REGION}.battle.net/oauth/token?grant_type=client_credentials`,
    {},
    { auth: { username: BNET_CLIENT_ID, password: BNET_CLIENT_SECRET } }
  );
  return resp.data.access_token;
}

// POST /api/members/scan → Scan und speichern
router.post('/scan', auth, async (req, res) => {
  try {
    const token = await fetchBnetToken();
    const url = `https://${REGION}.api.blizzard.com/data/wow/guild/${GUILD_REALM.toLowerCase()}/${GUILD_NAME.toLowerCase()}/roster?namespace=profile-${REGION}&locale=de_DE`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Upsert aller Member
    const ops = data.members.map(m => ({
      updateOne: {
        filter: { id: m.character.id },
        update: {
          id: m.character.id,
          name: m.character.name,
          rank: m.rank,
          level: m.character.level,
          class: m.character.playable_class.name,
          spec: m.character.active_spec?.name || null,
          updatedAt: new Date()
        },
        upsert: true
      }
    }));
    await GuildMember.bulkWrite(ops);

    res.json({ message: 'Scan erfolgreich', count: data.members.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Fehler beim Scan' });
  }
});

// GET /api/members → Liste aller Member
router.get('/', auth, async (req, res) => {
  const members = await GuildMember.find().sort('name');
  res.json(members);
});

// DELETE /api/members/:id → einzelnen Member löschen
router.delete('/:id', auth, async (req, res) => {
  await GuildMember.deleteOne({ id: req.params.id });
  res.json({ message: 'Member gelöscht' });
});

module.exports = router;
