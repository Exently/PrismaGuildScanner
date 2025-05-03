const mongoose = require('mongoose');

const GuildMemberSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  rank: String,
  level: Number,
  class: String,
  spec: String,
  vaultSlots: {
    type: Number,
    default: 0
  },
  vaultLevel: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GuildMember', GuildMemberSchema);
