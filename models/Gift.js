const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
    // The unique Code/PIN user enters (index for speed)
    pinCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    // AR Content
    videoUrl: { type: String, required: true },
    targetFile: { type: String, required: true }, // .mind file url

    // Optional Metadata
    clientName: { type: String },
    createdAt: { type: Date, default: Date.now },

    // --- SECURITY: Device Locking ---
    // If null, first device to access becomes the owner.
    // If set, only this UUID is allowed (unless Master PIN used).
    boundDeviceId: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Gift', giftSchema);
