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

// JWT Auth Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';

    try {
        const decoded = jwt.verify(token, secret);
        req.admin = decoded; // Attach admin info to request
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Helper: Compress image using Sharp
async function compressImage(imageUrl) {
    console.log('📦 Compressing image:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to download image');

    const buffer = Buffer.from(await response.arrayBuffer());
    const compressed = await sharp(buffer)
        .resize(600, null, { withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();

    console.log(`✅ Compressed: ${buffer.length} → ${compressed.length} bytes`);
    return compressed;
}

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ MongoDB Connected'));


// --- API ---

// Admin Login (JWT Generation)
app.post('/api/admin/login', (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Noto\'g\'ri parol' });
        }

        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

        const token = jwt.sign(
            { role: 'admin', timestamp: Date.now() },
            secret,
            { expiresIn }
        );

        res.json({
            success: true,
            token,
            expiresIn
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


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

// Auto-generate .mind file from marker image
app.post('/api/admin/generate-mind', adminAuth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });

        console.log('🎯 Starting .mind file generation for:', imageUrl);

        // Step 1: Compress image to save RAM
        const compressedBuffer = await compressImage(imageUrl);

        // Step 2: Save compressed image temporarily
        const tempImagePath = `./temp_compressed_${Date.now()}.jpg`;
        fs.writeFileSync(tempImagePath, compressedBuffer);

        // Step 3: Generate .mind file from compressed image
        const tempMindPath = `./temp_${Date.now()}.mind`;
        await generateMindFile(tempImagePath, tempMindPath);

        // Step 4: Upload .mind file to Cloudinary
        const mindFileBuffer = fs.readFileSync(tempMindPath);
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'pinhan_gifts',
                    resource_type: 'raw',
                    public_id: `mind_${Date.now()}`,
                    format: 'mind'
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(mindFileBuffer);
        });

        // Step 5: Cleanup temp files
        fs.unlinkSync(tempMindPath);
        fs.unlinkSync(tempImagePath);

        console.log('✅ .mind file generated and uploaded:', uploadResult.secure_url);

        res.json({ success: true, mindUrl: uploadResult.secure_url });
    } catch (error) {
        console.error('❌ Mind generation error:', error);
        res.status(500).json({
            error: 'Failed to generate .mind file',
            details: error.message,
            manualUploadRequired: true // Signal frontend to show manual upload option
        });
    }
});

// Manual .mind file upload (fallback when auto-generation fails)
app.post('/api/admin/upload-mind', adminAuth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });

        // Verify it's a .mind file
        if (!req.file.originalname.endsWith('.mind')) {
            return res.status(400).json({ error: 'Faqat .mind fayllar qabul qilinadi' });
        }

        console.log('📤 Manual .mind file uploaded:', req.file.path);
        res.json({ success: true, mindUrl: req.file.path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: 'unknown',
        cloudinary: 'unknown'
    };

    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState === 1) {
            health.mongodb = 'connected';
        } else {
            health.mongodb = 'disconnected';
            health.status = 'degraded';
        }

        // Check Cloudinary configuration
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            health.cloudinary = 'configured';
        } else {
            health.cloudinary = 'not configured';
            health.status = 'degraded';
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (err) {
        res.status(500).json({
            status: 'unhealthy',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// --- STATIC SERVING & SPA FALLBACK ---
const clientDistPath = path.join(__dirname, 'client/dist');

// Serve static files with proper MIME types
app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// SPA Fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    const indexPath = path.join(clientDistPath, 'index.html');

    // Check if index.html exists
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(500).send('Build files not found. Please run: npm run build');
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
