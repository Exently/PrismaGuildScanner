// backend/routes/members.js
const express = require('express');
const axios = require('axios');
const GuildMember = require('../models/GuildMember');
const auth = require('./authMiddleware');

const router = express.Router();
const {
    BNET_CLIENT_ID, BNET_CLIENT_SECRET,
    GUILD_NAME, GUILD_REALM, REGION, RAIDER_IO_API_KEY
} = process.env;

async function fetchVaultInfo(name) {
    const realm = GUILD_REALM.toLowerCase();
    const url = `https://raider.io/api/v1/characters/profile`;
    const params = {
      region: REGION,
      realm,
      name,
      fields: 'mythic_plus_weekly_highest_level_runs'
    };
    if (RAIDER_IO_API_KEY) params.api_key = RAIDER_IO_API_KEY;
  
    const { data } = await axios.get(url, { params });
    // runs ist ein Array mit deinen drei besten Keys der Woche
    const runs = data.mythic_plus_weekly_highest_level_runs || [];
    const vaultSlots = runs.length;
    const vaultLevel = runs.reduce(
      (max, r) => Math.max(max, r.mythic_level), 
      0
    );
    return { vaultSlots, vaultLevel };
  }

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
router.get('/scan', auth, async (req, res) => {
    try {
        const token = await fetchBnetToken();
        const url = `https://${REGION}.api.blizzard.com/data/wow/guild/${GUILD_REALM.toLowerCase()}/${GUILD_NAME.toLowerCase()}/roster?namespace=profile-${REGION}&locale=de_DE`;
        const { data } = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Nur Level‐80 filtern und auf die Felder reduzieren, die wir brauchen
        const lvl80 = data.members
            .filter(m => m.character.level === 80)
            .map(m => ({
                id: m.character.id,
                name: m.character.name,
                rank: m.rank,
                level: m.character.level,
                class: m.character.playable_class.name,
                spec: m.character.active_spec?.name || null
            }));

        return res.json(lvl80);
    } catch (err) {
        console.error('Scan-Fehler:', err.response?.data || err.message);
        return res.status(500).json({ message: 'Scan fehlgeschlagen' });
    }
});


// POST /api/members → einzelnen Member tracken (in DB speichern)
router.post('/', auth, async (req, res) => {
    try {
        const { id, name, rank, level, class: cls, spec } = req.body;
        // findOneAndUpdate mit upsert
        const member = await GuildMember.findOneAndUpdate(
            { id },
            { id, name, rank, level, vaultSlots, vaultLevel, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json(member);
    } catch (err) {
        console.error('Track-Fehler:', err.message);
        res.status(500).json({ message: 'Fehler beim Tracken' });
    }
});

// GET /api/members → Liste aller Member
router.get('/', auth, async (req, res) => {
    try {
      const members = await GuildMember.find().sort('name');
      // für jeden DB-Eintrag Vault-Daten holen
      const enriched = await Promise.all(
        members.map(async m => {
          const { vaultSlots, vaultLevel } = await fetchVaultInfo(m.name);
          return {
            id: m.id,
            name: m.name,
            level: m.level,
            // füge die Vault-Infos hinzu
            vaultSlots,
            vaultLevel
          };
        })
      );
      res.json(enriched);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Fehler beim Laden der Mitglieder' });
    }
  });

// DELETE /api/members/:id → einzelnen Member löschen
router.delete('/:id', auth, async (req, res) => {
    await GuildMember.deleteOne({ id: req.params.id });
    res.json({ message: 'Member gelöscht' });
});

module.exports = router;
