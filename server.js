require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();

// --- CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// MongoDB Schemas
const projectSchema = new mongoose.Schema({
    uuid: { type: String, required: true, unique: true },
    name: { type: String, default: 'Nomsiz' },
    client_info: { type: String, default: '' },
    video_path: String,
    mind_path: String,
    image_path: String,
    marker_ratio: Number,
    video_ratio: Number,
    views: { type: Number, default: 0 },
    marker_hash: String,
    created_at: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

// Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pinhan_box',
        resource_type: 'auto',
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const nameWithoutExt = path.parse(file.originalname).name;
            return `${nameWithoutExt}-${uniqueSuffix}`;
        }
    }
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// Auth Middleware
const isAdmin = (req, res, next) => {
    // Basic cookie check
    if (req.cookies && req.cookies.admin_auth === 'true') next();
    else res.status(401).json({ error: 'Auth required' });
};

// --- ROUTES ---

// 1. Check Auth Route (Fix for "Login topilmadi")
app.get('/api/check-auth', isAdmin, (req, res) => {
    res.json({ authenticated: true, user: req.cookies.admin_user || 'Admin' });
});

// 2. Root Route
app.get('/', (req, res) => {
    res.send('Pinhan Box Server is Running 24/7');
});

// 2. Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: req.file.path, file: req.file });
});

// --- APP ROUTES (Preserved for functionality) ---

// Login
app.post('/api/v1/login', (req, res) => {
    const { username, password } = req.body;
    
    // Get credentials from env or fallback to defaults (for safety)
    const validUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const validPass = (process.env.ADMIN_PASSWORD || 'admin123');

    const inputUser = (username || '').toLowerCase().trim();
    const inputPass = (password || '').trim();

    if (inputUser === validUser && inputPass === validPass) {
        res.cookie('admin_auth', 'true', { maxAge: 2592000000, path: '/' });
        res.cookie('admin_user', inputUser, { maxAge: 2592000000, path: '/' });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Login xatosi: Parol yoki Login noto\'g\'ri' });
    }
});

// Create Project (Uses Cloudinary URLs sent from frontend or handled here)
app.post('/api/v1/projects/create', isAdmin, async (req, res) => {
    try {
        const {
            projectName, clientInfo,
            videoPath, mindPath, imagePath,
            markerRatio, videoRatio, markerHash
        } = req.body;

        const existing = await Project.findOne({ marker_hash: markerHash });
        if (existing) {
            return res.status(409).json({ error: 'Duplicate marker', duplicate: true });
        }

        const uuid = uuidv4();
        await Project.create({
            uuid,
            name: projectName || 'Nomsiz',
            client_info: clientInfo || '',
            video_path: videoPath,
            mind_path: mindPath,
            image_path: imagePath,
            marker_ratio: markerRatio,
            video_ratio: videoRatio,
            marker_hash: markerHash
        });

        res.json({ success: true, link: `${req.protocol}://${req.get('host')}/ar.html?id=${uuid}`, uuid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Admin: List Projects
app.get('/api/admin/projects', isAdmin, async (req, res) => {
    try {
        const projects = await Project.find().sort({ created_at: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Admin: Edit Project
app.post('/api/admin/edit', isAdmin, async (req, res) => {
    try {
        const { uuid, name, client_info } = req.body;
        await Project.updateOne({ uuid }, { name, client_info });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update Error' });
    }
});

// Admin: Delete Project
app.post('/api/admin/delete', isAdmin, async (req, res) => {
    try {
        const { uuid } = req.body;
        await Project.deleteOne({ uuid });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete Error' });
    }
});

// Public: Get Project for AR
app.get('/api/project/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findOneAndUpdate(
            { uuid: id },
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!project) return res.status(404).json({ error: 'Not Found' });
        res.json({
            video: project.video_path,
            mind: project.mind_path,
            markerRatio: project.marker_ratio,
            videoRatio: project.video_ratio
        });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Support existing frontend upload flow (mocking the handle logic or redirecting)
app.post('/api/v1/blob/handle', isAdmin, (req, res) => {
    // Directing frontend to use the new /upload endpoint logic if needed
    // Or we provide a token that allows the frontend to call our /api/v1/blob/upload equivalent
    res.json({
        type: 'blob.generate-client-token',
        clientToken: 'cloud-token-' + Date.now(),
        url: '/api/v1/blob/upload'
    });
});

app.post('/api/v1/blob/upload', isAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({
        url: req.file.path,
        pathname: req.file.filename,
        contentType: req.file.mimetype,
        size: req.file.size
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Pinhan Box Cloud Server running on port ${PORT}`);
});
