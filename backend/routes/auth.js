const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const { AUTH_USER, AUTH_PASS, JWT_SECRET } = process.env;

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Einfache Prüfung gegen ENV-Variablen
  if (username === AUTH_USER && password === AUTH_PASS) {
    // Token erstellen (z.B. 8 Stunden gültig)
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  }
  res.status(401).json({ message: 'Unauthorized' });
});

module.exports = router;
