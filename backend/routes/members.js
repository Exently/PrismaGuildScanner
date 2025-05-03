const express = require('express');
const axios = require('axios');
const GuildMember = require('../models/GuildMember');
const auth = require('./authMiddleware');

const router = express.Router();
const {
    BNET_CLIENT_ID, BNET_CLIENT_SECRET,
    GUILD_NAME, GUILD_REALM, REGION, RAIDER_IO_API_KEY
} = process.env;

// Holt Mythic+ Vault-Run-Daten von Raider.io und berechnet Slots
async function fetchVaultInfo(name, realmSlug) {
    const charSlug = name.toLowerCase();
    const url = 'https://raider.io/api/v1/characters/profile';
    const params = {
        region: REGION,
        realm: realmSlug,
        name: charSlug,
        fields: 'mythic_plus_weekly_highest_level_runs'
    };
    if (RAIDER_IO_API_KEY) {
        params.access_key = RAIDER_IO_API_KEY;
    }

    console.log('⤷ fetchVaultInfo called with', { realmSlug, charSlug, params });
    try {
        const { data } = await axios.get(url, { params });
        const runs = data.mythic_plus_weekly_highest_level_runs || [];
        console.log(`⤷ Raider.io returned ${runs.length} runs for ${charSlug}@${realmSlug}`, runs);

        // Slot-1 = 2nd run, Slot-2 = 4th, Slot-3 = 8th
        const lvl2 = runs.length >= 2 ? runs[1].mythic_level : 0;
        const lvl4 = runs.length >= 4 ? runs[3].mythic_level : 0;
        const lvl8 = runs.length >= 8 ? runs[7].mythic_level : 0;

        const slot1 = lvl2 >= 10 ? 'MAX' : lvl2;
        const slot2 = lvl4 >= 10 ? 'MAX' : lvl4;
        const slot3 = lvl8 >= 10 ? 'MAX' : lvl8;

        return { slot1, slot2, slot3 };
    } catch (err) {
        console.error('⤷ Raider.io-Error:', err.response?.status, err.response?.data);
        return { slot1: 0, slot2: 0, slot3: 0 };
    }
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

// GET /api/members/scan → Scan Guild-Roster, filter Level 80 und liefere reduziert
router.get('/scan', auth, async (req, res) => {
    try {
        const token = await fetchBnetToken();
        const url = `https://${REGION}.api.blizzard.com/data/wow/guild/${GUILD_REALM.toLowerCase()}/${GUILD_NAME.toLowerCase()}/roster?namespace=profile-${REGION}&locale=de_DE`;
        const { data } = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const lvl80 = data.members
            .filter(m => m.character.level === 80)
            .map(m => ({
                id: m.character.id,
                name: m.character.name,
                rank: m.rank,
                level: m.character.level,
                class: m.character.playable_class.name,
                spec: m.character.active_spec?.name || null,
                realm: m.character.realm.slug
            }));

        return res.json(lvl80);
    } catch (err) {
        console.error('Scan-Fehler:', err.response?.data || err.message);
        return res.status(500).json({ message: 'Scan fehlgeschlagen' });
    }
});

// POST /api/members → Tracke einzelnen Member in DB
router.post('/', auth, async (req, res) => {
    try {
        const { id, name, rank, level, class: cls, spec, realm } = req.body;
        const member = await GuildMember.findOneAndUpdate(
            { id },
            { id, name, rank, level, class: cls, spec, realm, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json(member);
    } catch (err) {
        console.error('Track-Fehler:', err.message);
        res.status(500).json({ message: 'Fehler beim Tracken' });
    }
});

// GET /api/members → Liste aller getrackten Member mit Vault-Slots
router.get('/', auth, async (req, res) => {
    try {
        const members = await GuildMember.find().sort('name');
        const enriched = await Promise.all(
            members.map(async m => {
                const { slot1, slot2, slot3 } = await fetchVaultInfo(m.name, m.realm);
                return {
                    id: m.id,
                    name: m.name,
                    level: m.level,
                    realm: m.realm,
                    slot1, slot2, slot3
                };
            })
        );
        res.json(enriched);
    } catch (err) {
        console.error('Load-Fehler:', err.message);
        res.status(500).json({ message: 'Fehler beim Laden der Mitglieder' });
    }
});

// DELETE /api/members/:id → Lösche einzelnen Member
router.delete('/:id', auth, async (req, res) => {
    await GuildMember.deleteOne({ id: req.params.id });
    res.json({ message: 'Member gelöscht' });
});

module.exports = router;
