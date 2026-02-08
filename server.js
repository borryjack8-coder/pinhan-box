require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');

// Models
const Gift = require('./models/Gift');
const Settings = require('./models/Settings');
const User = require('./models/User');
const { generateMindFile } = require('./services/mindCompiler');

const app = express();
const PORT = process.env.PORT || 3000;
const MASTER_PIN = process.env.MASTER_PIN || '7777';

console.log('🚀 Starting Server (SaaS Mode)...');

// --- 1. CRITICAL: ENSURE DIRECTORIES EXIST ---
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(__dirname, 'temp');

try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
} catch (err) {
    console.error('❌ Critical Error creating directories:', err);
}

// --- 2. DATABASE & SEEDING ---
console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
    .then(async conn => {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        await seedAdmin();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Initial Admin Seeding Script
const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            console.log('🌱 No Admin found. Seeding Super Admin...');
            const newAdmin = new User({
                username: 'admin',
                password: 'admin123', // Will be hashed by pre-save hook
                role: 'admin',
                shopName: 'Pinhan HQ',
                balance: 999999
            });
            await newAdmin.save();
            console.log('✅ Super Admin Created: admin / admin123');
        } else {
            console.log('Login with existing admin account.');
        }
    } catch (err) {
        console.error('❌ Seeding Error:', err);
    }
};

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

// Auth Middleware (RBAC)
const auth = (roles = []) => {
    return async (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).json({ error: 'No token provided' });

        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Fetch latest user data (to check balance/role effectively)
            const user = await User.findById(decoded.id).select('-password');
            if (!user) return res.status(401).json({ error: 'User no longer exists' });

            if (roles.length && !roles.includes(user.role)) {
                return res.status(403).json({ error: 'Access denied' });
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('Auth Error:', err.message);
            res.status(401).json({ error: 'Invalid Token' });
        }
    };
};

// --- 5. IMAGE COMPRESSION ---
async function compressImage(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image for compression');
    const buffer = Buffer.from(await response.arrayBuffer());
    return await sharp(buffer)
        .resize(600, null, { withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
}

// --- 6. API ROUTES ---

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Noto\'g\'ri login yoki parol' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                shopName: user.shopName,
                balance: user.balance
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', auth(), (req, res) => {
    res.json(req.user);
});

// --- ADMIN ROUTES ---
// List all shops
app.get('/api/admin/shops', auth(['admin']), async (req, res) => {
    try {
        const shops = await User.find({ role: 'shop' }).select('-password').sort({ createdAt: -1 });
        res.json(shops);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create new Shop
app.post('/api/admin/shops', auth(['admin']), async (req, res) => {
    try {
        // Validation handled by mongoose schema
        const shop = new User({ ...req.body, role: 'shop' });
        await shop.save();
        res.json({ success: true, message: 'Shop created', shop: { username: shop.username, id: shop._id } });
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ error: 'Bu foydalanuvchi nomi band.' });
        res.status(500).json({ error: e.message });
    }
});

// Add Credit to Shop
app.post('/api/admin/shops/:id/credit', auth(['admin']), async (req, res) => {
    try {
        const { amount } = req.body;
        const shop = await User.findByIdAndUpdate(
            req.params.id,
            { $inc: { balance: Number(amount) } }, // Atomic Increment
            { new: true }
        ).select('-password');

        console.log(`💰 Added ${amount} credits to ${shop.username}. New Balance: ${shop.balance}`);
        res.json({ success: true, shop });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SHOP ROUTES (GIFT CREATION) ---

// Upload Helpers (Requires Auth)
// Note: We authenticate these now to prevent public uploads
app.post('/api/shop/upload', auth(['admin', 'shop']), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fayl yo\'q' });
    res.json({ url: req.file.path });
});
app.post('/api/shop/upload-mind', auth(['admin', 'shop']), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fayl yo\'q' });
    res.json({ mindUrl: req.file.path });
});

// Generate Mind (Requires Auth & Balance Check implied by next step, but ideally check here too? 
// No, generation is cheap, actual creation deducts credit. We'll verify credit on creation.)
app.post('/api/shop/generate-mind', auth(['admin', 'shop']), async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) throw new Error('Rasm URL yo\'q');

        // Check balance BEFORE doing heavy work (Optional but good practice)
        if (req.user.role === 'shop' && req.user.balance <= 0) {
            return res.status(402).json({ error: 'Hisobingizda mablag\' yetarli emas (0 credits)' });
        }

        const compressed = await compressImage(imageUrl);
        const tempJpg = path.join(tempDir, `temp_${Date.now()}.jpg`);
        const tempMind = path.join(tempDir, `temp_${Date.now()}.mind`);

        fs.writeFileSync(tempJpg, compressed);
        await generateMindFile(tempJpg, tempMind);

        const result = await cloudinary.uploader.upload(tempMind, {
            folder: 'pinhan_gifts',
            resource_type: 'raw',
            public_id: `mind_${Date.now()}`,
            use_filename: true, unique_filename: false
        });

        fs.unlinkSync(tempJpg);
        fs.unlinkSync(tempMind);

        res.json({ success: true, mindUrl: result.secure_url });
    } catch (err) {
        console.error("Gen Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// CREATE GIFT (THE TRANSACTION)
app.post('/api/shop/gifts', auth(['admin', 'shop']), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = req.user;

        // 1. Check Credit (Atomic check not possible on query, but redundant with update below)
        // However, we want to fail fast.
        if (user.role === 'shop' && user.balance <= 0) {
            throw new Error('Hisobingizda mablag\' yetarli emas (0 credits)');
        }

        // 2. Deduct Credit Atomically (Only for shops)
        if (user.role === 'shop') {
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id, balance: { $gt: 0 } }, // Condition: Must have > 0
                { $inc: { balance: -1 } },
                { new: true, session }
            );

            if (!updatedUser) {
                throw new Error('Mablag\' yetarli emas (Race condition prevented)');
            }
        }

        // 3. Create Gift
        const giftData = {
            ...req.body,
            userId: user._id, // Link to creator
            shopName: user.shopName,
            pinCode: req.body.pinCode || Math.floor(1000 + Math.random() * 9000).toString()
        };

        const gift = new Gift(giftData);
        await gift.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log(`✅ Gift Created by ${user.username}. Balance Deducted.`);
        res.json({ success: true, gift });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Transaction Error:", err);
        res.status(400).json({ error: err.message });
    }
});

// Get My Gifts
app.get('/api/shop/gifts', auth(['admin', 'shop']), async (req, res) => {
    try {
        const gifts = await Gift.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(gifts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/shop/gifts/:id', auth(['admin', 'shop']), async (req, res) => {
    try {
        const gift = await Gift.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!gift) return res.status(404).json({ error: 'Gift not found or access denied' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PUBLIC VIEW (AR) ---
app.get('/api/gifts/:id', async (req, res) => {
    try {
        const gift = await Gift.findById(req.params.id);
        if (!gift) return res.status(404).json({ error: "Gift not found" });
        res.json(gift);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/verify-pin', async (req, res) => {
    try {
        const { pinCode, deviceId } = req.body;
        if (pinCode === MASTER_PIN) return res.json({ success: true, data: { videoUrl: "https://demo", targetFile: "https://demo.mind" } });

        const gift = await Gift.findOne({ pinCode: pinCode.toUpperCase() });
        if (!gift) return res.status(404).json({ error: "PIN topilmadi" });

        // Logic for binding check ...
        if (!gift.boundDeviceId) gift.boundDeviceId = deviceId;
        else if (gift.boundDeviceId !== deviceId) return res.status(403).json({ error: "Boshqa qurilmaga bog'langan!" });

        gift.scanCount = (gift.scanCount || 0) + 1;
        await gift.save();
        res.json({ success: true, data: gift });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVE STATIC ---
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Endpoint Not Found' });
    const index = path.join(__dirname, 'client/dist/index.html');
    if (fs.existsSync(index)) res.sendFile(index);
    else res.status(500).send('Frontend Not Built');
});

app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
