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
    boundDeviceId: {
        type: String,
        default: null
    },

    // --- ANALYTICS & UI ---
    scanCount: {
        type: Number,
        default: 0
    },
    thumbnailUrl: {
        type: String, // Cloudinary URL for the marker image
        default: null
    }
});

module.exports = mongoose.model('Gift', giftSchema);
