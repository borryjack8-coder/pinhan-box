import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

const AdminPanel = () => {
    const [gifts, setGifts] = useState([]);
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newGift, setNewGift] = useState({ clientName: '', videoUrl: '', targetFile: '', pinCode: '' });
    const [selectedGift, setSelectedGift] = useState(null); // For QR Modal

    const fetchGifts = async (pass) => {
        const res = await fetch('/api/admin/gifts', {
            headers: { 'Authorization': `Bearer ${pass}` }
        });
        if (res.ok) {
            const data = await res.json();
            setGifts(data);
            setIsLoggedIn(true);
            localStorage.setItem('admin_pass', pass);
        } else {
            alert('Parol noto\'g\'ri!');
        }
    };

    useEffect(() => {
        const savedPass = localStorage.getItem('admin_pass');
        if (savedPass) {
            setPassword(savedPass);
            fetchGifts(savedPass);
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
            if (data.url) {
                setNewGift(prev => ({ ...prev, [type]: data.url }));
            } else {
                alert('Yuklashda xatolik: ' + data.error);
            }
        } catch (err) {
            alert('Yuklashda xatolik yuz berdi');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreate = async () => {
        if (!newGift.videoUrl || !newGift.targetFile) return alert('Hamma fayllarni yuklang!');

        const res = await fetch('/api/admin/gifts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${password}`
            },
            body: JSON.stringify(newGift)
        });
        if (res.ok) {
            setNewGift({ clientName: '', videoUrl: '', targetFile: '', pinCode: '' });
            fetchGifts(password);
        }
    };

    const handleReset = async (id) => {
        await fetch(`/api/admin/gifts/reset/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${password}` }
        });
        fetchGifts(password);
    };

    const handleDelete = async (id) => {
        if (!confirm('Haqiqatdan ham o\'chirmoqchimisiz?')) return;
        await fetch(`/api/admin/gifts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${password}` }
        });
        fetchGifts(password);
    };

    if (!isLoggedIn) {
        return (
            <div style={styles.loginPage}>
                <div style={styles.card}>
                    <h2 style={{ color: '#FFD700' }}>Admin Kirish</h2>
                    <input
                        type="password"
                        placeholder="Admin Paroli"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                    />
                    <button onClick={() => fetchGifts(password)} style={styles.button}>KIRISH</button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.adminPage}>
            <header style={styles.header}>
                <h1 style={{ color: '#FFD700' }}>Pinhan Box | Admin</h1>
                <button onClick={() => { localStorage.removeItem('admin_pass'); setIsLoggedIn(false); }} style={styles.logoutBtn}>Chiqish</button>
            </header>

            <div style={styles.container}>
                {/* CREATE FORM */}
                <section style={styles.section}>
                    <h3>Yangi Sovg'a Yaratish</h3>
                    <div style={styles.formGrid}>
                        <div style={styles.inputGroup}>
                            <label>Mijoz Ismi</label>
                            <input value={newGift.clientName} onChange={(e) => setNewGift({ ...newGift, clientName: e.target.value })} style={styles.input} />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Video (.mp4)</label>
                            <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'videoUrl')} style={styles.input} />
                            {newGift.videoUrl && <span style={styles.successText}>✅ Yuklandi</span>}
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Mind Fayl (.mind)</label>
                            <input type="file" accept=".mind" onChange={(e) => handleFileUpload(e, 'targetFile')} style={styles.input} />
                            {newGift.targetFile && <span style={styles.successText}>✅ Yuklandi</span>}
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Maxsus PIN (Ixtiyoriy)</label>
                            <input value={newGift.pinCode} onChange={(e) => setNewGift({ ...newGift, pinCode: e.target.value })} style={styles.input} />
                        </div>
                    </div>
                    <button onClick={handleCreate} disabled={isUploading} style={styles.createBtn}>
                        {isUploading ? 'YUKLANMOQDA...' : 'SAQLASH VA YARATISH'}
                    </button>
                </section>

                {/* LIST */}
                <section style={styles.section}>
                    <h3>Barcha Sovg'alar</h3>
                    <div style={styles.tableScroll}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>PIN</th>
                                    <th>Mijoz</th>
                                    <th>Device ID</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gifts.map(g => (
                                    <tr key={g._id}>
                                        <td style={{ fontWeight: 'bold', color: '#FFD700', fontSize: '18px' }}>{g.pinCode}</td>
                                        <td>{g.clientName}</td>
                                        <td>{g.boundDeviceId ? '🔒 Band' : '🔓 Ochiq'}</td>
                                        <td>
                                            <button onClick={() => setSelectedGift(g)} style={{ ...styles.actionBtn, background: '#FFD700', color: '#000' }}>QR Kod</button>
                                            <button onClick={() => handleReset(g._id)} style={styles.actionBtn}>Reset Lock</button>
                                            <button onClick={() => handleDelete(g._id)} style={{ ...styles.actionBtn, background: '#ff4444' }}>O'chir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* QR MODAL */}
            {selectedGift && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal} id="printable-area">
                        <h2 style={{ color: '#000', marginBottom: '20px' }}>Pinhan Box Sovg'asi</h2>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', display: 'inline-block' }}>
                            <QRCode value={`${window.location.origin}?id=${selectedGift._id}`} size={250} />
                        </div>
                        <h1 style={{ color: '#000', fontSize: '48px', margin: '20px 0' }}>{selectedGift.pinCode}</h1>
                        <p style={{ color: '#666' }}>Mijoz: {selectedGift.clientName}</p>
                        <div style={styles.modalButtons} className="no-print">
                            <button onClick={() => window.print()} style={styles.button}>Chop etish (Print)</button>
                            <button onClick={() => setSelectedGift(null)} style={{ ...styles.button, background: '#444', color: '#fff' }}>Yopish</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; text-align: center; padding: 50px; }
          .no-print { display: none !important; }
        }
      `}</style>
        </div>
    );
};

const styles = {
    loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
    card: { background: '#111', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid #333' },
    adminPage: { minHeight: '100vh', background: '#000', color: '#fff' },
    header: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222' },
    container: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
    section: { background: '#111', padding: '30px', borderRadius: '20px', marginBottom: '40px', border: '1px solid #222' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    input: { background: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '10px', outline: 'none' },
    button: { background: '#FFD700', color: '#000', border: 'none', padding: '15px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    createBtn: { width: '100%', background: '#FFD700', color: '#000', padding: '18px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: (props) => props.disabled ? 0.5 : 1 },
    logoutBtn: { background: '#222', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    tableScroll: { overflowX: 'auto' },
    actionBtn: { marginRight: '10px', padding: '10px 15px', fontSize: '12px', borderRadius: '8px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontWeight: '600' },
    successText: { color: '#00c851', fontSize: '12px', textAlign: 'right' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#fff', padding: '50px', borderRadius: '30px', textAlign: 'center', maxWidth: '500px', width: '90%' },
    modalButtons: { marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }
};

export default AdminPanel;
