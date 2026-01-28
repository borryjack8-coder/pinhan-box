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
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const [selectedGift, setSelectedGift] = useState(null); // Used for List view modal
    const [createdGift, setCreatedGift] = useState(null);   // Used for Success modal

    // CHANGED: Renamed thumbnailUrl -> markerUrl for consistency
    const [newGift, setNewGift] = useState({
        clientName: '',
        videoUrl: '',
        targetFile: '',
        markerUrl: '',
        pinCode: ''
    });

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
                return;
            }

            console.log(`✅ Upload Success (${type}):`, data);

            if (type === 'targetFile') {
                setNewGift(prev => ({ ...prev, targetFile: data.mindUrl || data.url }));
            } else {
                setNewGift(prev => ({ ...prev, [type]: data.url }));
            }

        } catch (err) {
            alert("Network Error during upload: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // --- CREATE GIFT ---
    const handleCreate = async () => {
        console.log("🛠️ Starting Gift Creation. Current State:", newGift);

        if (!newGift.clientName) return alert("Iltimos, Mijoz ismini kiriting");
        if (!newGift.videoUrl) return alert("Video faylni yuklang");
        if (!newGift.markerUrl) return alert("Marker rasmini yuklang");

        if (newGift.targetFile) {
            console.log("⏩ Manual Mind File detected. Skipping generation.");
            await submitGift(newGift);
        } else {
            console.log("⚙️ No Mind File. Starting Auto-Generation using markerUrl...");
            await generateAndSubmit();
        }
    };

    const generateAndSubmit = async () => {
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('admin_token');
            const generationPayload = { imageUrl: newGift.markerUrl };

            console.log("⚙️ Calling /generate-mind with:", generationPayload);

            const res = await fetch('/api/admin/generate-mind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(generationPayload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Generation Failed');

            console.log("✅ Mind Generated Successfully:", data.mindUrl);

            const readyGift = { ...newGift, targetFile: data.mindUrl };
            setNewGift(readyGift);
            await submitGift(readyGift);

        } catch (err) {
            console.error("Generatsiya Xatosi:", err);
            alert("Generatsiya Xatosi: " + err.message);
            setGenerationError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const submitGift = async (giftPayload) => {
        const token = localStorage.getItem('admin_token');
        if (!giftPayload.pinCode) giftPayload.pinCode = Math.floor(1000 + Math.random() * 9000).toString();

        const finalPayload = {
            ...giftPayload,
            thumbnailUrl: giftPayload.markerUrl
        };

        console.log("🎁 Submitting Final Payload:", finalPayload);

        try {
            const res = await fetch('/api/admin/gifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(finalPayload)
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`SERVER XATOSI: ${data.message || data.error}`);
                return;
            }

            // SUCCESS
            const gift = data.gift || data;
            console.log("✅ Created Gift:", gift);

            // Show Success Modal with QR Code
            setCreatedGift(gift);

            // Allow user to see the success before clearing form? 
            // Better to clear form behind the modal.
            setNewGift({ clientName: '', videoUrl: '', targetFile: '', markerUrl: '', pinCode: '' });
            setGenerationError(null);
            fetchData();
            setTab('list');

        } catch (err) {
            alert("TARMOQ XATOSI: " + err.message);
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

    // Modal for New Gift Success
    const renderSuccessModal = () => {
        if (!createdGift) return null;
        const viewUrl = `${window.location.origin}/view?id=${createdGift._id}`;

        return (
            <div className="modal-overlay" onClick={() => setCreatedGift(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'green', marginBottom: '20px' }}>✅ Sovg'a Yaratildi!</h2>

                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', display: 'inline-block', marginBottom: '20px' }}>
                        <QRCode value={viewUrl} size={200} />
                    </div>

                    <p style={{ marginBottom: '10px' }}><strong>Mijoz:</strong> {createdGift.clientName}</p>
                    <p style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>PIN: {createdGift.pinCode}</p>

                    <a href={viewUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'gold', display: 'block', marginBottom: '20px' }}>
                        Linkni ochish
                    </a>

                    <button onClick={() => setCreatedGift(null)} className="btn-primary">Yopish</button>
                </div>
            </div>
        );
    };

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
                                <input value={newGift.clientName} onChange={e => setNewGift({ ...newGift, clientName: e.target.value })} placeholder="Ism Familya" />
                            </div>

                            <div className="form-group">
                                <label>PIN (Ixtiyoriy):</label>
                                <input value={newGift.pinCode} onChange={e => setNewGift({ ...newGift, pinCode: e.target.value })} placeholder="1234" />
                            </div>

                            <hr style={{ margin: '20px 0', borderColor: '#444' }} />

                            <div className="form-group">
                                <label>1. Video (.mp4) {newGift.videoUrl && '✅'}</label>
                                <input type="file" accept="video/mp4,video/webm" onChange={e => handleFileUpload(e, 'videoUrl')} />
                            </div>

                            <div className="form-group">
                                <label>2. Marker Rasmi (.jpg/.png) {newGift.markerUrl && '✅'}</label>
                                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'markerUrl')} />
                            </div>

                            {(generationError || !isGenerating) && (
                                <div style={{ marginTop: '20px', padding: '15px', border: '1px dashed #555', borderRadius: '8px' }}>
                                    {generationError && <p style={{ color: 'red' }}>⚠️ {generationError}</p>}
                                    <label style={{ fontSize: '0.9em', color: '#aaa' }}>Qo'lda Mind Fayl (Ixtiyoriy):</label>
                                    <input type="file" accept=".mind" onChange={e => handleFileUpload(e, 'targetFile')} />
                                    {newGift.targetFile && <p style={{ color: 'lime' }}>✅ Mind Fayl Yuklandi</p>}
                                </div>
                            )}

                            <button
                                onClick={handleCreate}
                                disabled={isUploading || isGenerating}
                                className="btn-primary"
                                style={{ width: '100%', marginTop: '20px', padding: '15px', fontSize: '1.1em' }}
                            >
                                {isUploading ? 'YUKLANMOQDA...' : isGenerating ? 'GENERATSIYA QILINMOQDA...' : 'SAQLASH VA YARATISH'}
                            </button>
                        </div>
                    </div>
                )}
                {tab === 'settings' && <SettingsPanel />}
            </main>

            {/* List Selection Modal */}
            {selectedGift && (
                <div className="modal-overlay" onClick={() => setSelectedGift(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <h2>QR Kod</h2>
                        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', display: 'inline-block', margin: '20px 0' }}>
                            {/* NOTE: Updated URL format here too */}
                            <QRCode value={`${window.location.origin}/view?id=${selectedGift._id}`} />
                        </div>
                        <h3>PIN: {selectedGift.pinCode}</h3>
                        <p style={{ color: '#888', fontSize: '12px' }}>ID: {selectedGift._id}</p>
                        <button onClick={() => setSelectedGift(null)} className="nav-btn" style={{ marginTop: '20px' }}>Yopish</button>
                    </div>
                </div>
            )}

            {/* NEW SUCCESS MODAL */}
            {renderSuccessModal()}
        </div>
    );
};

export default AdminPanel;
