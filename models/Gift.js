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

    // SaaS / Multi-tenant Link
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shopName: { type: String }, // Optional denormalization

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
}
});

// Scalability Index: Faster queries for shops with many gifts
giftSchema.index({ userId: 1 });

module.exports = mongoose.model('Gift', giftSchema);
