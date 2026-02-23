import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import QRCode from 'react-qr-code';
import GiftsList from '../../components/admin/GiftsList';

// ── Inline SVG Icons ─────────────────────────────────────────────────────────
const IconHome = ({ active }) => <svg width="22" height="22" fill="none" stroke={active ? '#2dd4bf' : '#64748b'} strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const IconPlus = ({ active }) => <svg width="22" height="22" fill="none" stroke={active ? '#2dd4bf' : '#64748b'} strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconHistory = ({ active }) => <svg width="22" height="22" fill="none" stroke={active ? '#2dd4bf' : '#64748b'} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconUser = ({ active }) => <svg width="22" height="22" fill="none" stroke={active ? '#2dd4bf' : '#64748b'} strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

const ShopDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [gifts, setGifts] = useState([]);
    const [tab, setTab] = useState('home'); // home | create | history | profile
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [form, setForm] = useState({ clientName: '', pinCode: '', visibility: 'secret', video: null, image: null, mindFile: null });
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [createdGift, setCreatedGift] = useState(null);
    const [trackingMode, setTrackingMode] = useState('auto');
    const [compilerReady, setCompilerReady] = useState(false);
    const [selectedGift, setSelectedGift] = useState(null);

    useEffect(() => { fetchData(); }, []);

    // Load MindAR compiler
    useEffect(() => {
        if (trackingMode === 'auto' && !window.MINDAR) {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js";
            script.async = true;
            script.onload = () => setCompilerReady(true);
            document.body.appendChild(script);
        } else if (window.MINDAR) setCompilerReady(true);
    }, [trackingMode]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [meRes, giftsRes] = await Promise.all([
                axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/shop/gifts', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUser(meRes.data);
            localStorage.setItem('user', JSON.stringify(meRes.data));
            setGifts(giftsRes.data);
        } catch (err) {
            if (err.response?.status === 401) { localStorage.clear(); navigate('/login'); }
        }
    };

    const _loadImage = (file) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });

    const compileMindFile = async (imageFile) => {
        if (!window.MINDAR) throw new Error("Compiler not loaded yet");
        const compiler = new window.MINDAR.IMAGE.Compiler();
        const images = [await _loadImage(imageFile)];
        await compiler.compileImageTargets(images, (p) => setProgressMsg(`Analiz qilinmoqda... ${p.toFixed(1)}%`));
        const buf = await compiler.exportData();
        return new Blob([buf]);
    };

    const handleCreate = async () => {
        if (!form.clientName) return toast.error("Mijoz ismini kiriting!");
        if (!form.video) return toast.error("Video yuklanmagan!");
        if (!form.image) return toast.error("Rasm yuklanmagan!");
        if (trackingMode === 'manual' && !form.mindFile) return toast.error("Mind fayl (.mind) yuklanmagan!");
        if (user.balance <= 0) return toast.error("Yetarli limit yo'q! Admin bilan bog'laning.");

        setIsGenerating(true);
        setProgressMsg("Yuklanmoqda...");
        const token = localStorage.getItem('token');
        try {
            const fd = new FormData();
            fd.append('clientName', form.clientName);
            fd.append('visibility', form.visibility);
            if (form.pinCode) fd.append('pinCode', form.pinCode);
            fd.append('video', form.video);
            fd.append('image', form.image);

            if (trackingMode === 'auto') {
                setProgressMsg("Avtomatik Analiz (1-2 daqiqa)...");
                const blob = await compileMindFile(form.image);
                fd.append('mindFile', blob, 'targets.mind');
            } else {
                fd.append('mindFile', form.mindFile);
            }

            const res = await axios.post('/api/shop/gifts', fd, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });

            setCreatedGift(res.data.gift);
            toast.success("Sovg'a yaratildi! (-1 Credit)");
            setIsCreating(false);
            setForm({ clientName: '', pinCode: '', visibility: 'secret', video: null, image: null, mindFile: null });
            fetchData();
            setTab('history');
        } catch (err) {
            toast.error(err.response?.data?.error || "Xatolik yuz berdi");
        } finally {
            setIsGenerating(false);
            setProgressMsg('');
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/shop/gifts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("O'chirildi");
            fetchData();
        } catch { toast.error("Xatolik"); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/login'); };

    // ── CARD MODAL ─────────────────────────────────────────────────────────
    const cardUrl = selectedGift ? `${window.location.origin}/view?id=${selectedGift._id}` : '';

    // ── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="admin-page">
            <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.15)' } }} />

            {/* HEADER */}
            <header className="admin-header">
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: '#2dd4bf', margin: 0 }}>{user.shopName || 'Shop Panel'}</h1>
                    <p style={{ fontSize: 11, color: '#475569', margin: 0, marginTop: 2 }}>{user.username}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: 20, fontWeight: 700, color: user.balance < 5 ? '#f87171' : '#2dd4bf' }}>{user.balance} CR</span>
                        <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase' }}>Balans</span>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Chiqish
                    </button>
                </div>
            </header>

            {/* CONTENT */}
            <div style={{ flex: 1, overflow: 'auto' }}>

                {/* ── HOME TAB ── */}
                {tab === 'home' && (
                    <div style={{ padding: '24px' }}>
                        {/* Balance Card */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 24, padding: 24, marginBottom: 24 }}>
                            <p style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Mavjud Balans</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 40, fontWeight: 800, color: user.balance < 5 ? '#f87171' : '#2dd4bf' }}>{user.balance}</span>
                                <span style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Credits</span>
                            </div>
                            {user.balance < 5 && (
                                <p style={{ color: '#f87171', fontSize: 11, marginTop: 8, margin: '8px 0 0' }}>⚠️ Limit tugayapti! Admin bilan bog'laning.</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ color: '#818cf8', background: 'rgba(129,140,248,0.1)' }}>🎁</div>
                                <div className="stat-info"><h4>Sovg'alar</h4><p style={{ color: '#818cf8' }}>{gifts.length}</p></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.1)' }}>👁</div>
                                <div className="stat-info"><h4>Skanlar</h4><p style={{ color: '#fb923c' }}>{gifts.reduce((s, g) => s + (g.scanCount || 0), 0)}</p></div>
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => setTab('create')}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #2dd4bf, #10b981)', color: '#0f172a', border: 'none', borderRadius: 18, padding: '18px 0', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(45,212,191,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.3px' }}
                        >
                            ＋ YANGI SOVG'A YARATISH
                        </button>
                    </div>
                )}

                {/* ── CREATE TAB ── */}
                {tab === 'create' && (
                    <div style={{ padding: '24px', maxWidth: 560, margin: '0 auto' }}>
                        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>Yangi Sovg'a</h2>

                        {/* Tracking Mode */}
                        <div className="glass" style={{ padding: '16px', marginBottom: 20 }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Tracking Turi</label>
                            <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', padding: 4, borderRadius: 12 }}>
                                {[['auto', '⚡ Avtomatik (Oddiy)'], ['manual', '🛠️ Professional (.mind)']].map(([mode, label]) => (
                                    <button key={mode} onClick={() => setTrackingMode(mode)}
                                        style={{
                                            flex: 1, padding: '10px 8px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            background: trackingMode === mode ? 'linear-gradient(135deg,#2dd4bf,#10b981)' : 'transparent',
                                            color: trackingMode === mode ? '#0f172a' : '#64748b'
                                        }}>{label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="form-group">
                            <label>Mijoz Ismi *</label>
                            <input placeholder="Masalan: Aziz Karimov" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                            {[['secret', '🔒 SIRLI (1ta qurilma)'], ['public', '🌍 OMMAVIY (Cheksiz)']].map(([v, label]) => (
                                <button key={v} onClick={() => setForm({ ...form, visibility: v })}
                                    style={{
                                        padding: '12px 8px', borderRadius: 12, border: `1px solid ${form.visibility === v ? (v === 'public' ? '#34d399' : '#2dd4bf') : 'rgba(148,163,184,0.1)'}`, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        background: form.visibility === v ? (v === 'public' ? 'rgba(52,211,153,0.1)' : 'rgba(45,212,191,0.1)') : 'transparent',
                                        color: form.visibility === v ? (v === 'public' ? '#34d399' : '#2dd4bf') : '#64748b'
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="form-group">
                            <label>PIN Kodi (Ixtiyoriy)</label>
                            <input placeholder="Avto-generatsiya: bo'sh qoldiring" value={form.pinCode} onChange={e => setForm({ ...form, pinCode: e.target.value.toUpperCase() })} />
                        </div>

                        {/* File Inputs */}
                        {[
                            { key: 'video', label: '🎬 Video Fayl', accept: 'video/*' },
                            { key: 'image', label: trackingMode === 'auto' ? '🖼️ Marker Rasmi (Analiz uchun)' : "🖼️ Marker Rasmi (Ko'rinish uchun)", accept: 'image/*' },
                            ...(trackingMode === 'manual' ? [{ key: 'mindFile', label: '📦 .mind Fayli', accept: '.mind' }] : [])
                        ].map(({ key, label, accept }) => (
                            <label key={key} style={{
                                display: 'block', padding: '16px', border: `1.5px dashed ${form[key] ? '#2dd4bf' : 'rgba(148,163,184,0.2)'}`, borderRadius: 14, textAlign: 'center', cursor: 'pointer', marginBottom: 12, transition: 'all 0.2s',
                                background: form[key] ? 'rgba(45,212,191,0.06)' : 'transparent'
                            }}>
                                <span style={{ color: form[key] ? '#2dd4bf' : '#64748b', fontSize: 13, fontWeight: 600 }}>
                                    {label} {form[key] ? `✅ (${form[key].name})` : ''}
                                </span>
                                <input type="file" accept={accept} className="hidden" style={{ display: 'none' }} onChange={e => setForm({ ...form, [key]: e.target.files[0] })} />
                            </label>
                        ))}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button onClick={() => setTab('home')} style={{ flex: 1, padding: '14px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.1)', color: '#94a3b8', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                Bekor qilish
                            </button>
                            <button onClick={handleCreate} disabled={isGenerating}
                                style={{ flex: 2, padding: '14px', background: isGenerating ? 'rgba(45,212,191,0.3)' : 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: isGenerating ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
                                {isGenerating ? (progressMsg || 'YARATILMOQDA...') : 'YARATISH (−1 CR)'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── HISTORY TAB ── */}
                {tab === 'history' && (
                    <div>
                        <div style={{ padding: '20px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Sovg'alar ({gifts.length})</h2>
                        </div>
                        <GiftsList
                            gifts={gifts}
                            onSelect={setSelectedGift}
                            onDelete={handleDelete}
                            isLoading={false}
                        />
                    </div>
                )}

                {/* ── PROFILE TAB ── */}
                {tab === 'profile' && (
                    <div style={{ padding: 24 }}>
                        <div className="glass" style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#2dd4bf,#10b981)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>🏪</div>
                            <h2 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{user.shopName}</h2>
                            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>@{user.username}</p>
                        </div>

                        <div className="stat-card" style={{ marginBottom: 12 }}>
                            <div className="stat-icon" style={{ color: '#2dd4bf', background: 'rgba(45,212,191,0.1)' }}>💳</div>
                            <div className="stat-info"><h4>Balans</h4><p style={{ color: user.balance < 5 ? '#f87171' : '#2dd4bf' }}>{user.balance} CR</p></div>
                        </div>

                        <button onClick={handleLogout}
                            style={{ width: '100%', marginTop: 24, padding: '16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                            🚪 Chiqish
                        </button>
                    </div>
                )}
            </div>

            {/* QR MODAL */}
            {selectedGift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 28, width: '100%', maxWidth: 380, padding: 32, textAlign: 'center' }}>
                        <h3 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{selectedGift.clientName}</h3>
                        <p style={{ color: '#475569', fontSize: 12, margin: '0 0 24px' }}>PIN: {selectedGift.pinCode}</p>

                        <div id="print-area" style={{ background: 'white', borderRadius: 16, padding: 20 }}>
                            {selectedGift.thumbnailUrl && (
                                <img src={selectedGift.thumbnailUrl} alt="marker" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }} />
                            )}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                <QRCode value={cardUrl} size={130} />
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user.shopName}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>Scan to watch your gift</p>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => window.print()} style={{ flex: 1, padding: '14px', background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🖨️ Chop Etish</button>
                            <button onClick={() => setSelectedGift(null)} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Yopish</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE BOTTOM NAV */}
            <nav className="mobile-bottom-nav">
                {[
                    { id: 'home', label: 'Asosiy', icon: <IconHome active={tab === 'home'} /> },
                    { id: 'create', label: 'Yaratish', icon: <IconPlus active={tab === 'create'} /> },
                    { id: 'history', label: 'Tarix', icon: <IconHistory active={tab === 'history'} /> },
                    { id: 'profile', label: 'Profil', icon: <IconUser active={tab === 'profile'} /> },
                ].map(({ id, label, icon }) => (
                    <button key={id} className={`mobile-nav-item${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
                        <div className={tab === id ? 'nav-icon-bg' : ''}>{icon}</div>
                        {label}
                    </button>
                ))}
            </nav>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; border: none; background: white; }
                }
                /* Desktop: show tab pills instead of bottom nav */
                @media (min-width: 769px) {
                    .mobile-bottom-nav { display: none !important; }
                    .admin-page { padding-bottom: 0; }
                }
            `}</style>
        </div>
    );
};

export default ShopDashboard;