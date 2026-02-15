import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GiftManager from './pages/shop/GiftManager';
import AdminDashboard from './pages/admin/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import ARExperience from './components/ARExperience';
import toast, { Toaster } from 'react-hot-toast';

// Legacy Verification Component Wrapper
// We keep the logic for the "PIN Entry" page for end-users scanning QR codes
import { useState, useEffect } from 'react';
import axios from 'axios';

const VerificationPage = () => {
    const [pin, setPin] = useState('');
    const [giftData, setGiftData] = useState(null);
    const [error, setError] = useState('');
    const [step, setStep] = useState('pin'); // 'pin', 'loading', 'ar'

    // Device ID Logic
    const [deviceId, setDeviceId] = useState(localStorage.getItem('device_id'));
    useEffect(() => {
        if (!deviceId) {
            const id = 'dev_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', id);
            setDeviceId(id);
        }
    }, []);

    // Handle Direct Link
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            setStep('ar'); // Skip PIN, the ARExperience component will fetch data by ID
        }
    }, []);

    const handleVerify = async (e) => {
        e.preventDefault();
        setStep('loading');
        try {
            const res = await axios.post('/api/verify-pin', { pinCode: pin, deviceId });
            if (res.data.success) {
                setGiftData(res.data.data);
                toast.success("Sovg'a topildi!");
                setTimeout(() => setStep('ar'), 1000);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Xatolik");
            setStep('pin');
        }
    };

    if (step === 'ar') {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        // If we have giftData from PIN verification, pass it. 
        // If we have ID from URL, pass it implicitly via URL to ARExperience behavior (which checks URL).
        // Actually, ARExperience handles both props vs URL. 
        return <ARExperience videoUrl={giftData?.videoUrl} targetFile={giftData?.targetFile} />;
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Toaster />
            <div className="w-full max-w-md text-center">
                <img src="/logo.png" alt="logo" className="h-24 mx-auto mb-8 opacity-80" onError={(e) => e.target.style.display = 'none'} />

                {step === 'loading' ? (
                    <div className="text-pinhan-gold animate-pulse text-xl">Qidirilmoqda...</div>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-4">
                        <h1 className="text-2xl font-bold text-white mb-2">PIN KODNI KIRITING</h1>
                        <p className="text-zinc-500 mb-6 text-sm">Sovg'a qutisi ustidagi kodni kiriting</p>

                        <input
                            type="text"
                            maxLength={4}
                            value={pin}
                            onChange={e => setPin(e.target.value.toUpperCase())}
                            className="w-full bg-transparent border-b-2 border-zinc-700 text-center text-4xl font-bold text-pinhan-gold focus:border-pinhan-gold outline-none py-2 tracking-widest uppercase"
                            placeholder="A1B2"
                        />

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <button type="submit" className="w-full bg-zinc-800 text-white py-4 rounded-xl font-bold hover:bg-zinc-700 transition-colors">
                            KORISH
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<VerificationPage />} />
                <Route path="/view" element={<VerificationPage />} />

                {/* PROTECTED ROUTES */}
                <Route path="/admin" element={
                    <PrivateRoute roles={['admin']}>
                        <AdminDashboard />
                    </PrivateRoute>
                } />

                <Route path="/shop" element={
                    <PrivateRoute roles={['shop']}>
                        <GiftManager />
                    </PrivateRoute>
                } />
            </Routes>
        </Router>
    );
};

export default App;
