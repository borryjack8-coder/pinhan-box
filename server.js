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
const { generateMindFile } = require('./services/mindCompiler');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;
const MASTER_PIN = process.env.MASTER_PIN || '7777';

console.log('🚀 Starting Server (Zero-Tolerance Mode)...');

// --- 1. CRITICAL: ENSURE DIRECTORIES EXIST ---
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(__dirname, 'temp');

try {
    if (!fs.existsSync(uploadsDir)) {
        console.log('📂 Creating local uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(tempDir)) {
        console.log('📂 Creating local temp directory...');
        fs.mkdirSync(tempDir, { recursive: true });
    }
} catch (err) {
    console.error('❌ Critical Error creating directories:', err);
}

// --- 2. DATABASE ---
console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
    .then(conn => console.log(`✅ MongoDB Connected: ${conn.connection.host}`))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- 3. CLOUDINARY ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pinhan_gifts',
        resource_type: 'auto',
        public_id: (req, file) => Date.now() + '-' + file.originalname,
    },
});

const upload = multer({ storage: storage });

// --- 4. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Verbose Request Logging
app.use((req, res, next) => {
    console.log(`➡️  [${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST' && req.url.includes('/api/')) {
        console.log('📦 Body Keys:', Object.keys(req.body));
    }
    next();
});

// Auth Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET || 'secret');
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid Token' });
    }
};

// --- 5. IMAGE COMPRESSION ---
async function compressImage(imageUrl) {
    console.log('🖼️ Compressing:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image for compression');
    const buffer = Buffer.from(await response.arrayBuffer());
    return await sharp(buffer)
        .resize(600, null, { withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
}

// --- 6. API ROUTES ---

// Login
app.post('/api/admin/login', (req, res) => {
    try {
        const { password } = req.body;
        if (password !== (process.env.ADMIN_PASSWORD || 'admin123')) {
            console.warn('⚠️ Login Failed: Invalid Password');
            return res.status(401).json({ error: 'Noto\'g\'ri parol' });
        }
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        console.log('✅ Login Successful');
        res.json({ success: true, token });
    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Verify PIN
app.post('/api/verify-pin', async (req, res) => {
    try {
        const { pinCode, deviceId } = req.body;
        console.log(`🔑 Verify PIN: ${pinCode}, Device: ${deviceId}`);

        if (pinCode === MASTER_PIN) {
            return res.json({ success: true, data: { videoUrl: "https://demo", targetFile: "https://demo.mind" } });
        }

        const gift = await Gift.findOne({ pinCode: pinCode.toUpperCase() });
        if (!gift) {
            console.log('❌ PIN not found');
            return res.status(404).json({ error: "PIN topilmadi" });
        }

        if (gift.boundDeviceId && gift.boundDeviceId !== deviceId) {
            console.warn(`🔒 Device Locked. Expected ${gift.boundDeviceId}, got ${deviceId}`);
            return res.status(403).json({ error: "Boshqa qurilmaga bog'langan!" });
        }

        if (!gift.boundDeviceId) gift.boundDeviceId = deviceId;
        gift.scanCount = (gift.scanCount || 0) + 1;
        await gift.save();

        console.log('✅ Verified Gift:', gift.clientName);
        res.json({ success: true, data: gift });
    } catch (err) {
        console.error('❌ Verify Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPLOAD ROUTES (Wrapped)
app.post('/api/admin/upload', adminAuth, (req, res) => {
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, function (err) {
        if (err) {
            console.error('❌ Multer Upload Error:', err);
            return res.status(500).json({ success: false, message: 'Upload Error: ' + err.message });
        }

        if (!req.file) {
            console.error('❌ No file received in request');
            return res.status(400).json({ success: false, message: 'Fayl tanlanmadi' });
        }

        console.log('✅ File Uploaded via Multer:', req.file.path);
        res.json({ url: req.file.path });
    });
});

app.post('/api/admin/upload-mind', adminAuth, (req, res) => {
    const uploadSingle = upload.single('file');
    uploadSingle(req, res, function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!req.file) return res.status(400).json({ success: false, message: 'Fayl yo\'q' });

        console.log('✅ Mind File Uploaded:', req.file.path);
        res.json({ mindUrl: req.file.path });
    });
});

// Generate Mind
app.post('/api/admin/generate-mind', adminAuth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        console.log('🎯 Generatng Mind for:', imageUrl);

        if (!imageUrl) throw new Error('Rasm URL manzili yetishmayapti');

        const compressed = await compressImage(imageUrl);
        const tempJpg = path.join(tempDir, `temp_${Date.now()}.jpg`);
        const tempMind = path.join(tempDir, `temp_${Date.now()}.mind`);

        fs.writeFileSync(tempJpg, compressed);
        await generateMindFile(tempJpg, tempMind);

        // Upload generated .mind
        const result = await cloudinary.uploader.upload(tempMind, {
            folder: 'pinhan_gifts',
            resource_type: 'raw',
            public_id: `mind_${Date.now()}`,
            use_filename: true,
            unique_filename: false
        });

        // Clean
        fs.unlinkSync(tempJpg);
        fs.unlinkSync(tempMind);

        console.log('✅ Generation Complete:', result.secure_url);
        res.json({ success: true, mindUrl: result.secure_url });

    } catch (err) {
        console.error('❌ Generation Failed:', err);
        res.status(500).json({ success: false, message: 'Generatsiya xatosi: ' + err.message, manualUploadRequired: true });
    }
});

// Create Gift
app.post('/api/admin/gifts', adminAuth, async (req, res) => {
    try {
        console.log('🎁 Incoming Create Request:', req.body);
        const gift = new Gift(req.body);
        await gift.save();
        console.log('✅ Gift Saved:', gift._id);
        res.json(gift);
    } catch (err) {
        console.error('❌ Create Gift DB Error:', err);
        res.status(500).json({ success: false, message: 'Ma\'lumotlar bazasi xatosi: ' + err.message });
    }
});

// Get/Delete Gifts
app.get('/api/admin/gifts', adminAuth, async (req, res) => {
    try { res.json(await Gift.find().sort({ createdAt: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/gifts/:id', adminAuth, async (req, res) => {
    try { await Gift.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// Public Gift Fetch (For AR View)
app.get('/api/gifts/:id', async (req, res) => {
    try {
        const gift = await Gift.findById(req.params.id);
        if (!gift) return res.status(404).json({ error: "Gift not found" });
        res.json(gift);
    } catch (e) {
        console.error("Fetch Gift Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Analytics & Settings
app.get('/api/admin/analytics', adminAuth, async (req, res) => { /* ... Keep simple ... */
    try {
        const totalGifts = await Gift.countDocuments();
        const gifts = await Gift.find();
        const totalScans = gifts.reduce((acc, g) => acc + (g.scanCount || 0), 0);
        res.json({ totalGifts, totalScans });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings', async (req, res) => {
    try {
        let s = await Settings.findOne({ id: 'main_settings' });
        if (!s) { s = new Settings({}); await s.save(); }
        res.json(s);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/settings', adminAuth, async (req, res) => {
    try {
        const u = await Settings.findOneAndUpdate({ id: 'main_settings' }, req.body, { new: true, upsert: true });
        res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- 7. STATIC FILES ---
const clientDistPath = path.join(__dirname, 'client/dist');

// Serve Uploads Folder
console.log('📂 Serving Static /uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve Frontend
console.log('📂 Serving Static Client from:', clientDistPath);
app.use(express.static(clientDistPath));

// SPA Fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Endpoint Not Found' });

    const index = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(index)) {
        res.sendFile(index);
    } else {
        console.error('❌ client/dist/index.html missing!');
        res.status(500).send('Frontend Not Built');
    }
});

app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
