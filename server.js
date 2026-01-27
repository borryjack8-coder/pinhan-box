require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Gift = require('./models/Gift');
const Settings = require('./models/Settings');

const app = express();
const PORT = process.env.PORT || 3000;
const MASTER_PIN = process.env.MASTER_PIN || '7777';

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pinhan_gifts',
        resource_type: 'auto', // Important for .mind and video files
        public_id: (req, file) => Date.now() + '-' + file.originalname,
    },
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD || 'admin123'}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ MongoDB Connected'));

// --- API ---

app.post('/api/verify-pin', async (req, res) => {
    try {
        const { pinCode, deviceId } = req.body;
        if (pinCode === MASTER_PIN) {
            // Master access logic could be more robust, but following prompt
            return res.json({ success: true, data: { videoUrl: "https://demo.com", targetFile: "https://demo.mind" } });
        }

        const gift = await Gift.findOne({ pinCode: pinCode.toUpperCase() });
        if (!gift) return res.status(404).json({ error: "PIN noto'g'ri" });

        if (gift.boundDeviceId && gift.boundDeviceId !== deviceId) {
            return res.status(403).json({ error: "Bu sovg'a boshqa qurilmaga bog'langan!" });
        }

        if (!gift.boundDeviceId) {
            gift.boundDeviceId = deviceId;
        }

        // Increment Scan Count
        gift.scanCount = (gift.scanCount || 0) + 1;
        await gift.save();

        res.json({ success: true, data: gift });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// --- ADMIN API ---

// File Upload to Cloudinary
app.post('/api/admin/upload', adminAuth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    res.json({ url: req.file.path });
});

app.get('/api/admin/gifts', adminAuth, async (req, res) => {
    const gifts = await Gift.find().sort({ createdAt: -1 });
    res.json(gifts);
});

app.post('/api/admin/gifts', adminAuth, async (req, res) => {
    try {
        const gift = new Gift(req.body);
        await gift.save();
        res.json(gift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/gifts/reset/:id', adminAuth, async (req, res) => {
    const gift = await Gift.findByIdAndUpdate(req.params.id, { boundDeviceId: null }, { new: true });
    res.json(gift);
});

app.delete('/api/admin/gifts/:id', adminAuth, async (req, res) => {
    await Gift.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- ANALYTICS ---
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
    try {
        const totalGifts = await Gift.countDocuments();
        const gifts = await Gift.find();
        const totalScans = gifts.reduce((acc, g) => acc + (g.scanCount || 0), 0);
        const latestGifts = await Gift.find().sort({ createdAt: -1 }).limit(5);

        res.json({
            totalGifts,
            totalScans,
            latestGifts
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ---
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne({ id: 'main_settings' });
        if (!settings) {
            settings = new Settings({});
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/settings', adminAuth, async (req, res) => {
    try {
        const updated = await Settings.findOneAndUpdate(
            { id: 'main_settings' },
            { ...req.body, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serving
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'client/dist', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server: ${PORT}`));
