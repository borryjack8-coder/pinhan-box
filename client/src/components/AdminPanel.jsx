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

    const checkAuth = async (pass) => {
        const res = await fetch('/api/admin/gifts', {
            headers: { 'Authorization': `Bearer ${pass}` }
        });
        if (res.ok) {
            setIsLoggedIn(true);
            localStorage.setItem('admin_pass', pass);
            fetchData(pass);
        } else if (pass) {
            alert('Parol noto\'g\'ri!');
        }
    };

    const fetchData = async (pass) => {
        setIsLoading(true);
        try {
            const auth = pass || password;
            const [giftsRes, statsRes] = await Promise.all([
                fetch('/api/admin/gifts', { headers: { 'Authorization': `Bearer ${auth}` } }),
                fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${auth}` } })
            ]);
            if (giftsRes.ok) setGifts(await giftsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const savedPass = localStorage.getItem('admin_pass');
        if (savedPass) {
            setPassword(savedPass);
            checkAuth(savedPass);
        }
    }, []);

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${password}` },
                body: formData
            });
            const data = await res.json();
            if (data.url) setNewGift(prev => ({ ...prev, [type]: data.url }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreate = async () => {
        if (!newGift.thumbnailUrl) {
            alert('Marker rasmini yuklang!');
            return;
        }

        setIsGenerating(true);
        try {
            // Auto-generate .mind file from thumbnail
            const mindRes = await fetch('/api/admin/generate-mind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${password}`
                },
                body: JSON.stringify({ imageUrl: newGift.thumbnailUrl })
            });

            if (!mindRes.ok) {
                throw new Error('Mind file generation failed');
            }

            const { mindUrl } = await mindRes.json();

            // Create gift with auto-generated .mind file
            const res = await fetch('/api/admin/gifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${password}`
                },
                body: JSON.stringify({ ...newGift, targetFile: mindUrl })
            });

            if (res.ok) {
                setNewGift({ clientName: '', videoUrl: '', targetFile: '', thumbnailUrl: '', pinCode: '' });
                fetchData();
                setTab('list');
            }
        } catch (error) {
            console.error('Gift creation error:', error);
            alert('Sovg\'a yaratishda xatolik: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('O\'chirilsinmi?')) return;
        await fetch(`/api/admin/gifts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${password}` }
        });
        fetchData();
    };

    if (!isLoggedIn) {
        return (
            <div className="modal-overlay">
                <div className="modal-content glass">
                    <h2 style={{ color: 'var(--primary)', marginBottom: '30px' }}>Pinhan Box Admin</h2>
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Parolni kiriting"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button onClick={() => checkAuth(password)} className="btn-primary" style={{ width: '100%' }}>KIRISH</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 style={{ color: 'var(--primary)' }}>PINHAN BOX</h1>
                <button onClick={() => { localStorage.removeItem('admin_pass'); setIsLoggedIn(false); }} className="nav-btn">Chiqish</button>
            </header>

            <nav className="admin-nav">
                <button onClick={() => setTab('dashboard')} className={`nav-btn ${tab === 'dashboard' ? 'active' : ''}`}>DASHBOARD</button>
                <button onClick={() => setTab('list')} className={`nav-btn ${tab === 'list' ? 'active' : ''}`}>SOVG'ALAR</button>
                <button onClick={() => setTab('create')} className={`nav-btn ${tab === 'create' ? 'active' : ''}`}>YANGI QO'SHISH</button>
                <button onClick={() => setTab('settings')} className={`nav-btn ${tab === 'settings' ? 'active' : ''}`}>SOZLAMALAR</button>
            </nav>

            <main className="admin-content">
                {tab === 'dashboard' && <Dashboard stats={stats} />}
                {tab === 'list' && <GiftsList gifts={gifts} isLoading={isLoading} onSelect={setSelectedGift} onReset={() => { }} onDelete={handleDelete} />}
                {tab === 'create' && (
                    <div style={{ padding: '0 40px' }}>
                        <div className="glass" style={{ padding: '40px', maxWidth: '800px' }}>
                            <h3>Mijoz va Kontent</h3>
                            <div className="form-group">
                                <label>Mijoz Ismi</label>
                                <input value={newGift.clientName} onChange={e => setNewGift({ ...newGift, clientName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Video (.mp4)</label>
                                <input type="file" onChange={e => handleFileUpload(e, 'videoUrl')} />
                                {newGift.videoUrl && <p style={{ color: 'var(--success)', fontSize: '12px' }}>✅ Video tayyor</p>}
                            </div>
                            <div className="form-group">
                                <label>Marker Rasmi (.jpg/.png)</label>
                                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'thumbnailUrl')} disabled={isGenerating} />
                                {newGift.thumbnailUrl && <p style={{ color: 'var(--success)', fontSize: '12px' }}>✅ Rasm tayyor (.mind fayl avtomatik yaratiladi)</p>}
                            </div>
                            <button onClick={handleCreate} disabled={isUploading || isGenerating} className="btn-primary">
                                {isGenerating ? 'TAYYORLANMOQDA (15-20 soniya)...' : isUploading ? 'YUKLANMOQDA...' : 'SOVG\'ANI YARATISH'}
                            </button>
                        </div>
                    </div>
                )}
                {tab === 'settings' && <SettingsPanel password={password} />}
            </main>

            {selectedGift && (
                <div className="modal-overlay" onClick={() => setSelectedGift(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#000', marginBottom: '20px' }}>Sovg'ani Skanerlang</h2>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block' }}>
                            <QRCode value={`${window.location.origin}?id=${selectedGift._id}`} size={256} />
                        </div>
                        <h1 style={{ color: '#000', fontSize: '48px', margin: '20px 0' }}>{selectedGift.pinCode}</h1>
                        <button onClick={() => window.print()} className="btn-primary">Chirib olish</button>
                        <button onClick={() => setSelectedGift(null)} className="nav-btn" style={{ marginLeft: '10px' }}>Yopish</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
