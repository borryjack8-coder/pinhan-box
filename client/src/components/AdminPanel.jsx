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
            console.log('🔐 Attempting Login...');
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                console.log('✅ Login Success');
                setIsLoggedIn(true);
                localStorage.setItem('admin_token', data.token);
                fetchData(data.token);
            } else {
                console.warn('⚠️ Login Failed:', data.error);
                alert(data.error || 'Parol noto\'g\'ri!');
            }
        } catch (err) {
            console.error('❌ Network Error:', err);
            alert('Tarmoq xatosi: Server ishlayaptimi?');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchData = async (explicitToken) => {
        const token = explicitToken || localStorage.getItem('admin_token');
        if (!token) return;

        try {
            const [giftsRes, statsRes] = await Promise.all([
                fetch('/api/admin/gifts', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (giftsRes.status === 401) {
                handleLogout();
                return;
            }

            if (giftsRes.ok) setGifts(await giftsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (err) {
            console.error("❌ Stats Fetch Error:", err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setIsLoggedIn(false);
        setPassword('');
    };

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            setIsLoggedIn(true);
            fetchData(token);
        }
    }, []);

    // --- FILE UPLOAD ---
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const token = localStorage.getItem('admin_token');
        if (!token) return;

        setIsUploading(true);
        console.log(`📤 Uploading ${type}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);

        const endpoint = type === 'targetFile' ? '/api/admin/upload-mind' : '/api/admin/upload';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Upload failed');

            console.log(`✅ Upload Success (${type}):`, data);

            if (data.mindUrl) setNewGift(prev => ({ ...prev, targetFile: data.mindUrl }));
            else if (data.url) setNewGift(prev => ({ ...prev, [type]: data.url }));

        } catch (err) {
            console.error("❌ Upload Error:", err);
            alert("Yuklashda xatolik: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // --- CREATE GIFT ---
    const handleCreate = async () => {
        // Validation check
        if (!newGift.clientName) return alert('Mijoz ismini kiriting!');
        if (!newGift.videoUrl) return alert('Video yuklanmagan!');
        if (!newGift.thumbnailUrl) return alert('Marker rasmi yuklanmagan!');

        // Manual Validation (if manual upload used)
        if (newGift.targetFile) {
            console.log("⏩ Using manual .mind file");
            await createGift();
            return;
        }

        // Auto Generation
        console.log("⚙️ Starting Auto-Generation...");
        setIsGenerating(true);
        setGenerationError(null);

        try {
            const token = localStorage.getItem('admin_token');
            const mindRes = await fetch('/api/admin/generate-mind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ imageUrl: newGift.thumbnailUrl })
            });

            if (!mindRes.ok) {
                const errorData = await mindRes.json();
                console.error("❌ Mind Generation Failed:", errorData);
                throw new Error(errorData.details || 'Mind file generation failed');
            }

            const { mindUrl } = await mindRes.json();
            console.log("✅ Mind File Generated:", mindUrl);

            // Should update state AND proceed immediately
            const updatedGift = { ...newGift, targetFile: mindUrl };
            setNewGift(updatedGift); // Update UI

            await createGift(mindUrl); // Pass directly to avoid race condition

        } catch (error) {
            console.error('❌ Auto-generation error:', error);
            setGenerationError(error.message);
            alert("Mind File yaratishda xatolik: " + error.message + "\n\nQo'lda yuklab ko'ring.");
        } finally {
            setIsGenerating(false);
        }
    };

    const createGift = async (overrideMindUrl) => {
        const token = localStorage.getItem('admin_token');

        // Final PIN Generation if empty
        const finalPin = newGift.pinCode || Math.floor(1000 + Math.random() * 9000).toString();

        const payload = {
            ...newGift,
            pinCode: finalPin,
            targetFile: overrideMindUrl || newGift.targetFile
        };

        console.log("🎁 Sending Gift Create Request:", payload);

        try {
            const res = await fetch('/api/admin/gifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const responseData = await res.json();

            if (res.ok) {
                console.log("✅ Gift Created Successfully:", responseData);
                alert(`Sovg'a Yaratildi! PIN: ${responseData.pinCode}`);
                setNewGift({ clientName: '', videoUrl: '', targetFile: '', thumbnailUrl: '', pinCode: '' });
                setGenerationError(null);
                fetchData();
                setTab('list');
            } else {
                console.error("❌ Server Rejected Creation:", responseData);
                alert('Xatolik: ' + (responseData.error || 'Noma\'lum xato'));
            }
        } catch (error) {
            console.error('❌ Network/Client Error:', error);
            alert('Tarmoq xatosi: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('O\'chirilsinmi?')) return;
        const token = localStorage.getItem('admin_token');
        try {
            await fetch(`/api/admin/gifts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (e) {
            alert("O'chirishda xatolik");
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="modal-overlay">
                <div className="modal-content glass">
                    <h2 style={{ color: 'var(--primary)', marginBottom: '30px' }}>Pinhan Box Admin</h2>
                    <div className="form-group">
                        <input type="password" placeholder="Parol" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button onClick={() => checkAuth(password)} className="btn-primary" style={{ width: '100%' }}>KIRISH</button>
                    {isLoading && <p>Yuklanmoqda...</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 style={{ color: 'var(--primary)' }}>PINHAN BOX</h1>
                <button onClick={handleLogout} className="nav-btn">Chiqish</button>
            </header>

            <nav className="admin-nav">
                <button onClick={() => setTab('dashboard')} className={`nav-btn ${tab === 'dashboard' ? 'active' : ''}`}>DASHBOARD</button>
                <button onClick={() => setTab('list')} className={`nav-btn ${tab === 'list' ? 'active' : ''}`}>SOVG'ALAR</button>
                <button onClick={() => setTab('create')} className={`nav-btn ${tab === 'create' ? 'active' : ''}`}>YANGI QO'SHISH</button>
                <button onClick={() => setTab('settings')} className={`nav-btn ${tab === 'settings' ? 'active' : ''}`}>SOZLAMALAR</button>
            </nav>

            <main className="admin-content">
                {tab === 'dashboard' && <Dashboard stats={stats} />}
                {tab === 'list' && <GiftsList gifts={gifts} isLoading={false} onSelect={setSelectedGift} onReset={() => { }} onDelete={handleDelete} />}
                {tab === 'create' && (
                    <div style={{ padding: '0 40px' }}>
                        <div className="glass" style={{ padding: '40px', maxWidth: '800px' }}>
                            <h3>Yangi Sovg'a</h3>

                            <div className="form-group">
                                <label>Mijoz Ismi</label>
                                <input value={newGift.clientName} onChange={e => setNewGift({ ...newGift, clientName: e.target.value })} placeholder="Ism kiriting" />
                            </div>

                            <div className="form-group">
                                <label>PIN Kod (Ixtiyoriy)</label>
                                <input value={newGift.pinCode} onChange={e => setNewGift({ ...newGift, pinCode: e.target.value })} placeholder="Bo'sh qolsa avtomatik generatsiya bo'ladi" />
                            </div>

                            <hr style={{ borderColor: '#333', margin: '20px 0' }} />

                            <div className="form-group">
                                <label>1. Video Yuklash (.mp4)</label>
                                <input type="file" onChange={e => handleFileUpload(e, 'videoUrl')} />
                                {newGift.videoUrl && <p style={{ color: 'var(--success)', fontSize: '12px' }}>✅ Video: {newGift.videoUrl.slice(-20)}</p>}
                            </div>

                            <div className="form-group">
                                <label>2. Marker Rasmi (.jpg)</label>
                                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'thumbnailUrl')} disabled={isGenerating} />
                                {newGift.thumbnailUrl && <p style={{ color: 'var(--success)', fontSize: '12px' }}>✅ Rasm: {newGift.thumbnailUrl.slice(-20)}</p>}
                            </div>

                            {generationError && (
                                <div style={{ background: '#ff444420', border: '1px solid #ff4444', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
                                    <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '10px' }}>⚠️ Avtomatik generatsiya xatosi: {generationError}</p>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Qo'lda .mind fayl yuklash</label>
                                        <input type="file" accept=".mind" onChange={e => handleFileUpload(e, 'targetFile')} />
                                        {newGift.targetFile && <p style={{ color: 'var(--success)', fontSize: '12px' }}>✅ Mind fayl tayyor</p>}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleCreate} disabled={isUploading || isGenerating} className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>
                                {isGenerating ? 'GENERATE QILINMOQDA (Kuting)...' : isUploading ? 'YUKLANMOQDA...' : 'SAQLASH & PIN OLISH'}
                            </button>
                        </div>
                    </div>
                )}
                {tab === 'settings' && <SettingsPanel password={password} />}
            </main>

            {selectedGift && (
                <div className="modal-overlay" onClick={() => setSelectedGift(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>QR Kod & PIN</h2>
                        <div style={{ background: '#fff', padding: '20px', margin: '20px 0', display: 'inline-block', borderRadius: '10px' }}>
                            <QRCode value={`${window.location.origin}?id=${selectedGift.pinCode}`} />
                        </div>
                        <h1>{selectedGift.pinCode}</h1>
                        <button onClick={() => setSelectedGift(null)} className="nav-btn">Yopish</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
