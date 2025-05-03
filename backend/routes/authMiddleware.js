// backend/routes/authMiddleware.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Kein Token' });
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token ungültig' });
  }
};
