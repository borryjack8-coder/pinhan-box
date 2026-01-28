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

console.log('🚀 Starting Server...');

// --- 1. CRITICAL: ENSURE UPLOADS DIR EXISTS ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log('📂 Creating local uploads directory...');
    fs.mkdirSync(uploadsDir);
}

// --- 2. DATABASE DEBUGGING ---
console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
    .then(conn => console.log(`✅ MongoDB Connected: ${conn.connection.host}`))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        // Do not exit process, let it retry or fail gracefully
    });

// --- 3. CLOUDINARY CONFIG ---
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
app.use(cors()); // Allow all CORS for now to fix permission issues
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.url}`);
    next();
});

// Auth Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
    try {
        const decoded = jwt.verify(token, secret);
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// --- 5. HELPER FUNCTIONS ---
async function compressImage(imageUrl) {
    console.log('📦 Compressing image:', imageUrl);
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to download image');
        const buffer = Buffer.from(await response.arrayBuffer());
        return await sharp(buffer)
            .resize(600, null, { withoutEnlargement: true, fit: 'inside' })
            .jpeg({ quality: 85 })
            .toBuffer();
    } catch (e) {
        console.error('❌ Compression Failed:', e);
        throw e;
    }
}

// --- 6. API ROUTES (WITH ERROR HANDLING) ---

// Login
app.post('/api/admin/login', (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPassword) return res.status(401).json({ error: 'Noto\'g\'ri parol' });

        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Login Status Failed' });
    }
});

// Verify PIN
app.post('/api/verify-pin', async (req, res) => {
    try {
        const { pinCode, deviceId } = req.body;
        console.log(`🔑 Verify PIN: ${pinCode}, Device: ${deviceId}`);

        if (pinCode === MASTER_PIN) {
            return res.json({ success: true, data: { videoUrl: "https://res.cloudinary.com/demo/video/upload/dog.mp4", targetFile: "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.0/examples/image-tracking/assets/card-example/card.mind" } });
        }

        const gift = await Gift.findOne({ pinCode: pinCode.toUpperCase() });
        if (!gift) {
            console.log('❌ PIN not found');
            return res.status(404).json({ error: "PIN noto'g'ri" });
        }

        if (gift.boundDeviceId && gift.boundDeviceId !== deviceId) {
            console.log(`⚠️ Device Locked: Gift ${gift.boundDeviceId} vs Current ${deviceId}`);
            return res.status(403).json({ error: "Bu sovg'a boshqa qurilmaga bog'langan!" });
        }

        if (!gift.boundDeviceId) gift.boundDeviceId = deviceId;
        gift.scanCount = (gift.scanCount || 0) + 1;
        await gift.save();

        console.log('✅ Gift Verified:', gift.clientName);
        res.json({ success: true, data: gift });
    } catch (err) {
        console.error('❌ Verify PIN Error:', err);
        res.status(500).json({ error: "Server PIN Error: " + err.message });
    }
});

// Upload File
app.post('/api/admin/upload', adminAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
        console.error('❌ No file received in /api/admin/upload');
        return res.status(400).json({ error: 'Fayl yuklanmadi' });
    }
    console.log('✅ File Uploaded:', req.file.path);
    res.json({ url: req.file.path });
});

// Generate Mind (Heavy Logic)
app.post('/api/admin/generate-mind', adminAuth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });

        console.log('🎯 Generating .mind for:', imageUrl);

        // Use temp directory for processing
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const compressedBuffer = await compressImage(imageUrl);
        const tempImagePath = `${tempDir}/temp_${Date.now()}.jpg`;
        const tempMindPath = `${tempDir}/temp_${Date.now()}.mind`;

        fs.writeFileSync(tempImagePath, compressedBuffer);

        await generateMindFile(tempImagePath, tempMindPath); // Ensure this Service exists and throws if fails!

        const mindFileBuffer = fs.readFileSync(tempMindPath);

        // Upload to Cloudinary as 'raw' file
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'pinhan_gifts', resource_type: 'raw', format: 'mind' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(mindFileBuffer);
        });

        // Cleanup
        fs.unlinkSync(tempMindPath);
        fs.unlinkSync(tempImagePath);

        console.log('✅ .mind Generated & Uploaded:', uploadResult.secure_url);
        res.json({ success: true, mindUrl: uploadResult.secure_url });
    } catch (error) {
        console.error('❌ Mind Gen Failed:', error);
        res.status(500).json({ error: 'Generation Failed', details: error.message, manualUploadRequired: true });
    }
});

// Manual Mind Upload
app.post('/api/admin/upload-mind', adminAuth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    console.log('✅ Manual Mind Upload:', req.file.path);
    res.json({ success: true, mindUrl: req.file.path });
});

// Create Gift (Replaces previous logic with heavy debug)
app.post('/api/admin/gifts', adminAuth, async (req, res) => {
    try {
        console.log('🎁 Creating Gift. Body:', req.body);
        const { clientName, pinCode, videoUrl, targetFile, thumbnailUrl } = req.body;

        // Validation
        if (!clientName || !pinCode || !videoUrl || !targetFile) {
            console.error('❌ Missing Fields:', req.body);
            return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart!' });
        }

        const gift = new Gift(req.body);
        await gift.save();
        console.log('✅ Gift Saved to DB:', gift._id);
        res.json(gift);
    } catch (err) {
        console.error('❌ Create Gift Error:', err);
        res.status(500).json({ error: "DB Error: " + err.message });
    }
});

// Get Gifts
app.get('/api/admin/gifts', adminAuth, async (req, res) => {
    try {
        const gifts = await Gift.find().sort({ createdAt: -1 });
        res.json(gifts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Gift
app.delete('/api/admin/gifts/:id', adminAuth, async (req, res) => {
    try {
        await Gift.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Gift
app.post('/api/admin/gifts/reset/:id', adminAuth, async (req, res) => {
    try {
        const gift = await Gift.findByIdAndUpdate(req.params.id, { boundDeviceId: null }, { new: true });
        res.json(gift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
    try {
        const totalGifts = await Gift.countDocuments();
        const gifts = await Gift.find();
        const totalScans = gifts.reduce((acc, g) => acc + (g.scanCount || 0), 0);
        const latestGifts = await Gift.find().sort({ createdAt: -1 }).limit(5);
        res.json({ totalGifts, totalScans, latestGifts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settings
app.get('/api/settings', async (req, res) => { // Public route
    try {
        let settings = await Settings.findOne({ id: 'main_settings' });
        if (!settings) { settings = new Settings({}); await settings.save(); }
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/settings', adminAuth, async (req, res) => {
    try {
        const updated = await Settings.findOneAndUpdate({ id: 'main_settings' }, { ...req.body, updatedAt: Date.now() }, { new: true, upsert: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));


// --- 7. STATIC SERVING (CORRECTED) ---
const clientDistPath = path.join(__dirname, 'client/dist');
console.log('📂 Serving Static files from:', clientDistPath);

app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });

    // Check if dist exists
    const indexPath = path.join(clientDistPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('❌ Critical: client/dist/index.html NOT FOUND. Build failed?');
        return res.status(500).send('Frontend build missing. Check server logs.');
    }
    res.sendFile(indexPath);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
