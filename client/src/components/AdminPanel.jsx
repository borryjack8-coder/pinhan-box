import React, { useState, useEffect } from 'react';
import Dashboard from './admin/Dashboard';
import GiftsList from './admin/GiftsList';
import SettingsPanel from './admin/SettingsPanel';
import QRCode from 'react-qr-code';

const AdminPanel = () => {
    const [tab, setTab] = useState('dashboard');
    const [gifts, setGifts] = useState([]);
    const [stats, setStats] = useState(null);
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newGift, setNewGift] = useState({ clientName: '', videoUrl: '', targetFile: '', thumbnailUrl: '', pinCode: '' });
    const [selectedGift, setSelectedGift] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);

    // --- AUTH ---
    const checkAuth = async (pass) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('admin_token', data.token);
                setIsLoggedIn(true);
                fetchData(data.token);
            } else {
                alert(data.error || 'Login xatosi');
            }
        } catch (err) {
            alert('Serverga ulanib bo\'lmadi');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchData = async (token) => {
        try {
            const storedToken = token || localStorage.getItem('admin_token');
            if (!storedToken) return;

            const res = await fetch('/api/admin/gifts', { headers: { 'Authorization': `Bearer ${storedToken}` } });
            if (res.ok) {
                setGifts(await res.json());
                // Analytics fetch
                fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${storedToken}` } })
                    .then(r => r.json()).then(setStats).catch(() => { });
            } else if (res.status === 401) {
                handleLogout();
            }
        } catch (e) { console.error(e); }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setIsLoggedIn(false);
    };

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            setIsLoggedIn(true);
            fetchData(token);
        }
    }, []);

    // --- UPLOAD HANDLER ---
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log(`📤 Uploading file for ${type}:`, file);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        const endpoint = type === 'targetFile' ? '/api/admin/upload-mind' : '/api/admin/upload';
        const token = localStorage.getItem('admin_token');

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (!res.ok) {
                alert(`Yuklash xatosi: ${data.message || data.error}`);
                console.error("Upload Failed:", data);
                return;
            }

            console.log("✅ Upload Response:", data);

            if (data.mindUrl) setNewGift(prev => ({ ...prev, targetFile: data.mindUrl }));
            else if (data.url) setNewGift(prev => ({ ...prev, [type]: data.url }));

        } catch (err) {
            alert("Network Error during upload: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // --- CREATE GIFT ---
    const handleCreate = async () => {
        console.log("🛠️ Starting Gift Creation Process...");

        // 1. Validation
        if (!newGift.clientName) return alert("Iltimos, Mijoz ismini kiriting");
        if (!newGift.videoUrl) return alert("Video faylni yuklang");
        if (!newGift.thumbnailUrl) return alert("Marker rasmini yuklang");

        if (newGift.targetFile) {
            // Manual Mind File present
            await submitGift(newGift);
        } else {
            // Auto-Generate
            await generateAndSubmit();
        }
    };

    const generateAndSubmit = async () => {
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('admin_token');
            console.log("⚙️ Requesting Mind Generation for:", newGift.thumbnailUrl);

            const res = await fetch('/api/admin/generate-mind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ imageUrl: newGift.thumbnailUrl })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Generation Failed');

            console.log("✅ Mind Generated:", data.mindUrl);

            const readyGift = { ...newGift, targetFile: data.mindUrl };
            setNewGift(readyGift);
            await submitGift(readyGift);

        } catch (err) {
            alert("Generatsiya Xatosi: " + err.message);
            setGenerationError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const submitGift = async (giftPayload) => {
        const token = localStorage.getItem('admin_token');
        // Ensure PIN
        if (!giftPayload.pinCode) giftPayload.pinCode = Math.floor(1000 + Math.random() * 9000).toString();

        console.log("🎁 Submitting Gift Payload:", giftPayload);

        try {
            const res = await fetch('/api/admin/gifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(giftPayload)
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`XATOLIK (${res.status}): ${data.message || data.error}`);
                return;
            }

            alert(`✅ SOVG'A YARATILDI!\nPIN: ${data.pinCode}`);
            setNewGift({ clientName: '', videoUrl: '', targetFile: '', thumbnailUrl: '', pinCode: '' });
            fetchData();
            setTab('list');

        } catch (err) {
            alert("Tarmoq xatosi: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("O'chirilsinmi?")) return;
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/gifts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchData();
    };


    if (!isLoggedIn) {
        return (
            <div className="modal-overlay">
                <div className="modal-content glass">
                    <h2>Admin Login</h2>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Parol" style={{ margin: '20px 0', padding: '10px' }} />
                    <button onClick={() => checkAuth(password)} className="btn-primary" disabled={isLoading}>{isLoading ? '...' : 'KIRISH'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1>Pinhan Admin</h1>
                <button onClick={handleLogout} className="nav-btn">Chiqish</button>
            </header>
            <nav className="admin-nav">
                <button onClick={() => setTab('dashboard')} className={tab === 'dashboard' ? 'active' : ''}>Dashboard</button>
                <button onClick={() => setTab('list')} className={tab === 'list' ? 'active' : ''}>Sovg'alar</button>
                <button onClick={() => setTab('create')} className={tab === 'create' ? 'active' : ''}>Yangi</button>
                <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>Sozlamalar</button>
            </nav>

            <main className="admin-content">
                {tab === 'dashboard' && <Dashboard stats={stats} />}
                {tab === 'list' && <GiftsList gifts={gifts} onDelete={handleDelete} onSelect={setSelectedGift} />}
                {tab === 'create' && (
                    <div style={{ padding: '20px' }}>
                        <div className="glass" style={{ padding: '30px', maxWidth: '600px' }}>
                            <h3>Yangi Sovg'a Yaratish</h3>
                            <div className="form-group">
                                <label>Mijoz Ismi:</label>
                                <input value={newGift.clientName} onChange={e => setNewGift({ ...newGift, clientName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>PIN (Ixtiyoriy):</label>
                                <input value={newGift.pinCode} onChange={e => setNewGift({ ...newGift, pinCode: e.target.value })} />
                            </div>
                            <hr style={{ margin: '20px 0', borderColor: '#444' }} />
                            <div className="form-group">
                                <label>1. Video (.mp4) {newGift.videoUrl && '✅'}</label>
                                <input type="file" onChange={e => handleFileUpload(e, 'videoUrl')} />
                            </div>
                            <div className="form-group">
                                <label>2. Rasm (.jpg) {newGift.thumbnailUrl && '✅'}</label>
                                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'thumbnailUrl')} />
                            </div>
                            {generationError && (
                                <div style={{ color: 'red', border: '1px solid red', padding: '10px', borderRadius: '5px' }}>
                                    <p>Avto-generatsiya xatosi: {generationError}</p>
                                    <label>Qo'lda Mind Fayl Yuklash:</label>
                                    <input type="file" accept=".mind" onChange={e => handleFileUpload(e, 'targetFile')} />
                                </div>
                            )}
                            <button onClick={handleCreate} disabled={isUploading || isGenerating} className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                                {isUploading ? 'YUKLANMOQDA...' : isGenerating ? 'GENERATSIYA...' : 'YARATISH'}
                            </button>
                        </div>
                    </div>
                )}
                {tab === 'settings' && <SettingsPanel />}
            </main>

            {selectedGift && (
                <div className="modal-overlay" onClick={() => setSelectedGift(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{selectedGift.pinCode}</h2>
                        <QRCode value={`${window.location.origin}?id=${selectedGift.pinCode}`} />
                        <button onClick={() => setSelectedGift(null)} className="nav-btn" style={{ marginTop: '20px' }}>Yopish</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
