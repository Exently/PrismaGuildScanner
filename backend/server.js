require('dotenv').config();
const GuildMember = require('./models/GuildMember');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);


// MongoDB-Verbindung
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB verbunden'))
  .catch(err => console.error('❌ MongoDB-Fehler:', err));


// Health-Check-Route
app.get('/', (req, res) => {
  res.send('Prisma Guild Scanner API läuft');
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
});
