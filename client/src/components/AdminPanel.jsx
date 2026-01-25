import React, { useState, useEffect } from 'react';

const AdminPanel = () => {
    const [gifts, setGifts] = useState([]);
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [newGift, setNewGift] = useState({ clientName: '', videoUrl: '', targetFile: '', pinCode: '' });

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

    const handleCreate = async () => {
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
                <h1 style={{ color: '#FFD700' }}>Pinhan Box | Admin Panel</h1>
                <button onClick={() => { localStorage.removeItem('admin_pass'); setIsLoggedIn(false); }} style={styles.logoutBtn}>Chiqish</button>
            </header>

            <div style={styles.container}>
                {/* CREATE FORM */}
                <section style={styles.section}>
                    <h3>Yangi Sovg'a Yaratish</h3>
                    <div style={styles.formGrid}>
                        <input placeholder="Mijoz Ismi" value={newGift.clientName} onChange={(e) => setNewGift({ ...newGift, clientName: e.target.value })} style={styles.input} />
                        <input placeholder="Video URL (Cloudinary)" value={newGift.videoUrl} onChange={(e) => setNewGift({ ...newGift, videoUrl: e.target.value })} style={styles.input} />
                        <input placeholder="Mind URL (.mind)" value={newGift.targetFile} onChange={(e) => setNewGift({ ...newGift, targetFile: e.target.value })} style={styles.input} />
                        <input placeholder="PIN (Ixtiyoriy)" value={newGift.pinCode} onChange={(e) => setNewGift({ ...newGift, pinCode: e.target.value })} style={styles.input} />
                    </div>
                    <button onClick={handleCreate} style={styles.createBtn}>YARATISH</button>
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
                                        <td style={{ fontWeight: 'bold', color: '#FFD700' }}>{g.pinCode}</td>
                                        <td>{g.clientName}</td>
                                        <td style={{ fontSize: '10px', color: '#888' }}>{g.boundDeviceId || 'Bosh (Not Locked)'}</td>
                                        <td>
                                            <button onClick={() => handleReset(g._id)} style={styles.actionBtn}>Reset Lock</button>
                                            <button onClick={() => handleDelete(g._id)} style={{ ...styles.actionBtn, background: '#ff4444' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

const styles = {
    loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
    card: { background: '#111', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid #333' },
    adminPage: { minHeight: '100vh', background: '#000', color: '#fff' },
    header: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222' },
    container: { padding: '40px' },
    section: { background: '#111', padding: '25px', borderRadius: '15px', marginBottom: '30px', border: '1px solid #222' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' },
    input: { background: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '8px' },
    button: { background: '#FFD700', color: '#000', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    createBtn: { width: '100%', background: '#FFD700', color: '#000', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    logoutBtn: { background: '#333', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableScroll: { overflowX: 'auto' },
    actionBtn: { marginRight: '10px', padding: '5px 10px', fontSize: '12px', borderRadius: '4px', border: 'none', background: '#444', color: '#fff', cursor: 'pointer' }
};

export default AdminPanel;
