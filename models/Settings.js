const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    id: { type: String, default: 'main_settings', unique: true },
    telegram: { type: String, default: '@pinhanbox' },
    instagram: { type: String, default: 'pinhan.box' },
    phone: { type: String, default: '+998000000000' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
