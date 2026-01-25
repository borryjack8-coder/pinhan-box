require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Gift = require('./models/Gift');

const app = express();

// --- DEPLOYMENT CONFIG ---
// Render sets PORT automatically.
const PORT = process.env.PORT || 3000;
const MASTER_PIN = process.env.MASTER_PIN || '7777';

// Middleware
app.use(cors());
app.use(express.json());

// Basic Admin Auth Middleware (for simplicity, can be expanded)
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD || 'admin123'}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// --- API ROUTES ---

// 1. Verify PIN & Handle Device Locking
app.post('/api/verify-pin', async (req, res) => {
    try {
        const { pinCode, deviceId } = req.body;

        // 1. Validate Input
        if (!pinCode || !deviceId) {
            return res.status(400).json({ error: "PIN or Device ID missing" });
        }

        // 2. Check Master PIN (Backdoor)
        if (pinCode === MASTER_PIN) {
            // Return a demo/testing gift or allow generic access
            // For this logic, we might need a specific 'demo' gift in DB or just bypass
            // Let's assume Master PIN just unlocks ANY gift if checking a specific one, 
            // but here we are looking up BY PIN. 
            // Strategy: Master PIN isn't a gift itself, it's an override. 
            // Actually, standard flow is: User enters PIN -> We find Gift.
            // If the PIN *IS* the master pin, maybe we return a generic demo gift?
            // Let's stick to the prompt: "If entered PIN is 7777... GRANT ACCESS".
            // But access to what? Typically a specific gift. 
            // Let's assume for this specific implementation, if they sent Master PIN, 
            // we return a specific 'demo' gift found in DB, OR we bypass device check if they sent a real PIN + Master Key? 
            // The prompt says "If the entered PIN is 7777". So 7777 creates a session.
            // We will look for a gift with pinCode '7777' OR just return a strict 'Success' payload for testing. 
            // Let's fetch a "DEMO" gift or create a mock response.
            return res.json({
                success: true,
                message: "Master Access Granted",
                data: {
                    videoUrl: "https://res.cloudinary.com/dme9cd3xw/video/upload/v1/demo.mp4",
                    targetFile: "https://res.cloudinary.com/dme9cd3xw/raw/upload/v1/targets.mind"
                }
            });
        }

        // 3. Find Gift in DB
        const gift = await Gift.findOne({ pinCode: pinCode.toUpperCase() });

        if (!gift) {
            return res.status(404).json({ error: "PIN kod noto'g'ri (Invalid PIN)" });
        }

        // 4. Device Locking Logic
        if (gift.boundDeviceId) {
            // Gift is already claimed. Check ownership.
            if (gift.boundDeviceId !== deviceId) {
                return res.status(403).json({
                    error: "Ushbu sovg'a boshqa qurilmaga bog'langan! (Gift locked to another device)"
                });
            }
            // Match! Grant Access.
        } else {
            // First time access! Bind it.
            gift.boundDeviceId = deviceId;
            await gift.save();
            console.log(`🔒 Gift ${gift.pinCode} bound to device ${deviceId}`);
        }

        // 5. Success
        res.json({
            success: true,
            data: {
                videoUrl: gift.videoUrl,
                targetFile: gift.targetFile,
                clientName: gift.clientName
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- ADMIN ROUTES ---

// 1. List all gifts
app.get('/api/admin/gifts', adminAuth, async (req, res) => {
    try {
        const gifts = await Gift.find().sort({ createdAt: -1 });
        res.json(gifts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Create a new gift
app.post('/api/admin/gifts', adminAuth, async (req, res) => {
    try {
        const { videoUrl, targetFile, clientName, pinCode } = req.body;

        // Auto-generate PIN if not provided
        const finalPin = pinCode || Math.random().toString(36).substring(2, 8).toUpperCase();

        const gift = new Gift({
            pinCode: finalPin,
            videoUrl,
            targetFile,
            clientName
        });

        await gift.save();
        res.json(gift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Reset device lock
app.post('/api/admin/gifts/reset/:id', adminAuth, async (req, res) => {
    try {
        const gift = await Gift.findByIdAndUpdate(req.params.id, { boundDeviceId: null }, { new: true });
        res.json(gift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Delete gift
app.delete('/api/admin/gifts/:id', adminAuth, async (req, res) => {
    try {
        await Gift.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCTION SERVING ---
// Serve frontend files from the React build folder
app.use(express.static(path.join(__dirname, 'client/dist')));

// Handle React Routing (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

/* 
  --- DEPLOYMENT TO RENDER ---
  1. Create a new Web Service on Render.
  2. Connect your GitHub repository.
  3. Settings:
     - Build Command: `npm run build`
     - Start Command: `node server.js`
     - Environment Variables (Add in Render dashboard):
       - MONGO_URI
       - MASTER_PIN
       - ADMIN_PASSWORD

*/
