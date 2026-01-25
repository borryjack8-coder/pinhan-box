import React, { useState, useEffect } from 'react';
import ARExperience from './components/ARExperience';
import AdminPanel from './components/AdminPanel';
import { v4 as uuidv4 } from 'uuid';

function App() {
    const [step, setStep] = useState('pin');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [giftData, setGiftData] = useState(null);

    // Simple Path Routing
    const isInternalAdmin = window.location.pathname === '/admin';

    // Initialize Device ID
    useEffect(() => {
        let devId = localStorage.getItem('pinhan_device_id');
        if (!devId) {
            devId = uuidv4();
            localStorage.setItem('pinhan_device_id', devId);
        }
    }, []);

    const handleVerify = async () => {
        if (!pin) return;

        setStep('loading');
        setError('');

        const deviceId = localStorage.getItem('pinhan_device_id');

        try {
            const res = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinCode: pin, deviceId })
            });

            const data = await res.json();

            if (data.success) {
                setGiftData(data.data);
                // Fake loading delay for better UX (prevent flash)
                setTimeout(() => setStep('ar'), 1500);
            } else {
                setError(data.error || "Xatolik yuz berdi");
                setStep('pin');
            }
        } catch (err) {
            setError("Tarmoq xatosi (Network Error)");
            setStep('pin');
        }
    };

    // ADMIN VIEW
    if (isInternalAdmin) {
        return <AdminPanel />;
    }

    // PUBLIC VIEW
    return (
        <div className="app-container" style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', overflow: 'hidden' }}>

            {/* 1. PIN ENTRY SCREEN */}
            {step === 'pin' && (
                <div style={styles.centerCol}>
                    <h1 style={{ color: '#FFD700', marginBottom: '10px' }}>PINHAN BOX</h1>
                    <p style={{ color: '#aaa', marginBottom: '30px', fontSize: '14px' }}>Sovg'ani ochish uchun PIN kodni kiriting</p>

                    <input
                        type="text"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.toUpperCase())}
                        placeholder="000000"
                        maxLength={10}
                        style={styles.input}
                    />

                    {error && <p style={{ color: '#ff4444', margin: '20px 0', fontSize: '14px' }}>{error}</p>}

                    <button onClick={handleVerify} style={styles.button}>
                        OCHISH
                    </button>
                </div>
            )}

            {/* 2. LOADING SCREEN */}
            {step === 'loading' && (
                <div style={styles.centerCol}>
                    <div className="spinner" style={styles.spinner}></div>
                    <h2 style={{ marginTop: '20px', color: '#FFD700', fontSize: '18px' }}>Tayyorlanmoqda...</h2>
                </div>
            )}

            {/* 3. AR EXPERIENCE */}
            {step === 'ar' && giftData && (
                <ARExperience
                    videoUrl={giftData.videoUrl}
                    targetFile={giftData.targetFile}
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
