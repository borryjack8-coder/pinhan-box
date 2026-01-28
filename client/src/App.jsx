import React, { useState, useEffect } from 'react';
import ARExperience from './components/ARExperience';
import AdminPanel from './components/AdminPanel';
import QRScanner from './components/QRScanner';
import { v4 as uuidv4 } from 'uuid';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [step, setStep] = useState('pin');
    const [pin, setPin] = useState('');
    const [giftData, setGiftData] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [settings, setSettings] = useState({ telegram: '', instagram: '', phone: '' });

    // Cloudinary URL Optimizer
    const optimizeUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        if (url.includes('/upload/')) {
            return url.replace('/upload/', '/upload/f_auto,q_auto/');
        }
        return url;
    };

    // Routing Checks
    const isInternalAdmin = window.location.pathname === '/admin';
    const isViewRoute = window.location.pathname === '/view';

    // Initialize
    useEffect(() => {
        let devId = localStorage.getItem('pinhan_device_id');
        if (!devId) {
            devId = uuidv4();
            localStorage.setItem('pinhan_device_id', devId);
        }

        // Settings
        fetch('/api/settings').then(res => res.json()).then(setSettings).catch(() => { });

        // Check for ID (Legacy PIN via URL)
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        // If /view route is active, we SKIP standard PIN logic and let ARExperience fetch data
        if (isViewRoute && urlId) {
            setStep('ar'); // Go directly to AR, ARExperience component will handle fetching by ID
            return;
        }

        // Legacy: If id is present on root (mostly PIN sharing), try auto-verify
        if (urlId) {
            handleVerify(null, urlId);
        }
    }, [isViewRoute]);

    const handleVerify = async (e, directId) => {
        const targetPin = directId || pin;
        if (!targetPin) return;

        setStep('loading');
        toast.loading('Sovg\'a qidirilmoqda...', { id: 'auth' });

        const deviceId = localStorage.getItem('pinhan_device_id');

        try {
            const res = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinCode: targetPin, deviceId }) // FIX: Use targetPin
            });

            const data = await res.json();

            if (data.success) {
                setGiftData(data.data);
                toast.success('Sovg\'a topildi!', { id: 'auth' });
                setTimeout(() => setStep('ar'), 1000);
            } else {
                toast.error(data.error || "PIN xato", { id: 'auth' });
                setStep('pin');
            }
        } catch (err) {
            toast.error("Tarmoq xatosi", { id: 'auth' });
            setStep('pin');
        }
    };

    // ADMIN
    if (isInternalAdmin) return <AdminPanel />;

    // AR VIEW
    // If step is AR, we render ARExperience.
    // If giftData is null (View flow), pass null, and ARExperience will fetch from URL.
    if (step === 'ar') {
        return (
            <div style={{ width: '100vw', height: '100vh', background: 'transparent' }}>
                <ARExperience
                    videoUrl={giftData ? optimizeUrl(giftData.videoUrl) : null}
                    targetFile={giftData ? giftData.targetFile : null}
                />
            </div>
        );
    }

    // PUBLIC VIEW (PIN)
    return (
        <div className="app-container" style={{ width: '100vw', height: '100vh', background: 'var(--bg-color)', color: '#fff', overflow: 'hidden' }}>
            <Toaster position="top-center" reverseOrder={false} />

            <AnimatePresence mode="wait">
                {step === 'pin' && (
                    <motion.div
                        key="pin"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="center-col"
                        style={styles.centerCol}
                    >
                        {/* Logo & Intro */}
                        <div className="logo-section" style={{ marginBottom: '40px' }}>
                            <img src="/logo.png" alt="Logo" style={{ width: '120px', height: 'auto', borderRadius: '20px', marginBottom: '15px' }} />
                            <h1 style={{ color: 'var(--primary)', fontSize: '42px', fontWeight: 'bold', margin: 0 }}>PINHAN BOX</h1>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', letterSpacing: '1px' }}>PREMIUM AR EXPERIENCE</p>
                        </div>

                        {/* Input Card */}
                        <div className="glass-card glass" style={{ padding: '40px', width: '90%', maxWidth: '400px' }}>
                            <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>Sovg'ani ochish uchun PIN kodni kiriting</p>

                            <input
                                type="text"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.toUpperCase())}
                                placeholder="******"
                                maxLength={10}
                                style={styles.input}
                            />

                            <button onClick={() => handleVerify()} className="btn-primary" style={{ ...styles.button, width: '100%' }}>
                                OCHISH
                            </button>

                            <div style={{ margin: '30px 0', borderTop: '1px solid var(--glass-border)', position: 'relative' }}>
                                <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '0 10px', fontSize: '12px', color: 'var(--text-dim)' }}>YOKI</span>
                            </div>

                            <button onClick={() => setShowScanner(true)} className="nav-btn" style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                                QR KODNI SKANERLASH
                            </button>
                        </div>

                        {/* Footer */}
                        <div style={{ position: 'fixed', bottom: '30px', display: 'flex', gap: '20px' }}>
                            {settings.telegram && <a href={`https://t.me/${settings.telegram.replace('@', '')}`} target="_blank" className="nav-btn">Telegram</a>}
                            {settings.instagram && <a href={`https://instagram.com/${settings.instagram}`} target="_blank" className="nav-btn">Instagram</a>}
                        </div>
                    </motion.div>
                )}

                {step === 'loading' && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.centerCol}>
                        <div className="loader" style={styles.spinner}></div>
                        <h2 style={{ marginTop: '20px', color: 'var(--primary)', fontSize: '18px' }}>Tayyorlanmoqda...</h2>
                    </motion.div>
                )}
            </AnimatePresence>

            {showScanner && (
                <QRScanner
                    onScanSuccess={(id) => { handleVerify(null, id); setShowScanner(false); }}
                    onScanError={() => { }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}

const styles = {
    centerCol: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', padding: '20px', textAlign: 'center'
    },
    input: {
        padding: '18px', borderRadius: '15px',
        border: '2px solid #333', background: '#000',
        color: '#FFD700', fontSize: '24px', fontWeight: 'bold',
        textAlign: 'center', letterSpacing: '4px',
        width: '100%', maxWidth: '280px', outline: 'none'
    },
    button: {
        marginTop: '30px', padding: '18px 60px',
        borderRadius: '40px', border: 'none',
        background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)',
        color: '#000', fontWeight: 'bold', fontSize: '16px',
        cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
    },
    spinner: {
        width: '50px', height: '50px',
        border: '4px solid rgba(255,215,0,0.1)',
        borderTop: '4px solid #FFD700',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    }
};

export default App;
