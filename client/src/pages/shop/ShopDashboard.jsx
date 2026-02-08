import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import QRCode from 'react-qr-code';

const ShopDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [gifts, setGifts] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [form, setForm] = useState({ clientName: '', videoUrl: '', markerUrl: '', pinCode: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [createdGift, setCreatedGift] = useState(null);

    // --- 1. INITIAL FETCH ---
    useEffect(() => {
        fetchData();
        // DEBUG: Check Environment
        console.log("Environment Check:", {
            NODE_ENV: import.meta.env.MODE,
            API_URL: import.meta.env.VITE_API_URL || 'relative path'
        });
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [meRes, giftsRes] = await Promise.all([
                axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/shop/gifts', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setUser(meRes.data);
            localStorage.setItem('user', JSON.stringify(meRes.data)); // Sync
            setGifts(giftsRes.data);
        } catch (err) {
            console.error("Fetch Data Error:", err);
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate('/login');
            }
        }
    };

    // --- 2. LOGOUT ---
    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // --- 3. UPLOAD HANDLER ---
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log(`Starting Upload [${type}]:`, file.name, `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');

        try {
            const res = await axios.post('/api/shop/upload', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            console.log("Upload Success:", res.data);
            setForm(prev => ({ ...prev, [type]: res.data.url }));
            toast.success("Fayl yuklandi");
        } catch (err) {
            console.error("Upload Error:", err);
            const errMsg = err.response?.data?.error || err.message || "Yuklashda xatolik";
            alert(`XATOLIK: ${errMsg}`);
            toast.error(errMsg);
        } finally {
            setIsUploading(false);
        }
    };

    // --- 4. CREATE GIFT FLOW (NUCLEAR DEBUG MODE) ---
    const handleCreate = async () => {
        // Validation with specific alerts
        if (!form.clientName) return alert("Iltimos, Mijoz ismini kiriting!");
        if (!form.videoUrl) return alert("Video yuklanmagan!");
        if (!form.markerUrl) return alert("Rasm (Marker) yuklanmagan!");

        if (user.balance <= 0) {
            alert("Sizda yetarli limit mavjud emas! Administratorga murojaat qiling.");
            return;
        }

        // 1. Alert to prove code is updated
        alert("DEBUG START: Starting Gift Creation...");

        setIsGenerating(true);
        console.log("Starting Gift Creation...", form);
        const token = localStorage.getItem('token');

        try {
            // A. Generate Mind File
            console.log("Step 1: Generating .mind file...");
            const genRes = await axios.post('/api/shop/generate-mind', { imageUrl: form.markerUrl }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Mind File Generated:", genRes.data);

            // B. Create Gift (Transaction)
            console.log("Step 2: Creating Gift Transaction...");
            const payload = { ...form, targetFile: genRes.data.mindUrl };
            const createRes = await axios.post('/api/shop/gifts', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Gift Created:", createRes.data);

            setCreatedGift(createRes.data.gift);

            // SUCCESS FEEDBACK
            alert("Muvaffaqiyatli yaratildi! Balansdan 1 limit yechildi.");
            toast.success("Sovg'a yaratildi (-1 Credit)");

            setIsCreating(false);
            setForm({ clientName: '', videoUrl: '', markerUrl: '', pinCode: '' });
            fetchData(); // Refresh balance and list

        } catch (error) {
            console.error("FULL ERROR:", error);

            // --- THE NUCLEAR OPTION ---
            // This forces the browser to show the raw JSON object. 
            // It cannot fail to show text.
            const rawError = JSON.stringify(error.response || error, null, 2);
            alert("CRITICAL ERROR RAW DUMP:\n\n" + rawError);
            // --------------------------
        } finally {
            setIsGenerating(false);
        }
    };

    // --- 5. RENDER ---
    return (
        <div className="min-h-screen bg-pinhan-black text-white p-4 pb-20">
            <Toaster position="top-center" />

            {/* HEADER */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-bold text-pinhan-gold">{user.shopName}</h1>
                    <p className="text-xs text-zinc-500">Shop ID: {user.username}</p>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-bold">{user.balance} CR</span>
                    <button onClick={handleLogout} className="text-xs text-red-400">Chiqish</button>
                </div>
            </header>

            {/* MAIN ACTION */}
            {!isCreating && !createdGift && (
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full py-6 bg-gradient-to-r from-pinhan-gold to-yellow-600 rounded-2xl text-black font-bold text-xl shadow-lg hover:scale-[1.02] transition-transform mb-8 flex items-center justify-center gap-2"
                >
                    <span>+</span> YANGI SOVG'A
                </button>
            )}

            {/* CREATE FORM */}
            {isCreating && (
                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-700 mb-8 animate-fade-in">
                    <h2 className="text-lg font-bold mb-4">1. Sovg'a Ma'lumotlari</h2>

                    <div className="space-y-4">
                        <input
                            placeholder="Mijoz Ismi"
                            className="w-full bg-black p-3 rounded border border-zinc-700 focus:border-pinhan-gold outline-none"
                            value={form.clientName}
                            onChange={e => setForm({ ...form, clientName: e.target.value })}
                        />
                        <input
                            placeholder="PIN (Ixtiyoriy)"
                            className="w-full bg-black p-3 rounded border border-zinc-700 focus:border-pinhan-gold outline-none"
                            value={form.pinCode}
                            onChange={e => setForm({ ...form, pinCode: e.target.value })}
                        />

                        {/* File Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`block p-4 rounded border text-center cursor-pointer ${form.videoUrl ? 'border-green-500 text-green-500' : 'border-dashed border-zinc-600'}`}>
                                <span className="text-sm">🎬 Video Yuklash</span>
                                <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'videoUrl')} />
                                {isUploading && <span className="block text-xs text-yellow-500 mt-1">Yuklanmoqda...</span>}
                            </label>

                            <label className={`block p-4 rounded border text-center cursor-pointer ${form.markerUrl ? 'border-green-500 text-green-500' : 'border-dashed border-zinc-600'}`}>
                                <span className="text-sm">🖼️ Rasm Yuklash</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'markerUrl')} />
                                {isUploading && <span className="block text-xs text-yellow-500 mt-1">Yuklanmoqda...</span>}
                            </label>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded bg-zinc-800">Bekor qilish</button>
                            <button
                                onClick={handleCreate}
                                disabled={isUploading || isGenerating}
                                className={`flex-1 py-3 rounded text-black font-bold transition-all ${isGenerating ? 'bg-yellow-800 cursor-wait' : 'bg-pinhan-gold'}`}
                            >
                                {isGenerating ? 'YUKLANMOQDA... (Kuting)' : 'YARATISH (-1 CR)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT CARD (SUCCESS) */}
            {createdGift && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-white text-black p-6 rounded-xl max-w-sm w-full text-center">
                        <h2 className="text-2xl font-bold mb-4 text-pinhan-gold">Tayyor! ✅</h2>

                        {/* THE CARD TO PRINT */}
                        <div id="print-area" className="border-4 border-black p-4 rounded-lg bg-white relative overflow-hidden mb-4">
                            <div className="absolute top-0 left-0 bg-pinhan-gold text-xs font-bold px-2 py-1">PIN: {createdGift.pinCode}</div>
                            <img src={createdGift.thumbnailUrl} className="w-full h-40 object-cover rounded mb-4 border border-gray-200" alt="marker" />

                            <div className="flex justify-center my-2">
                                <QRCode value={`${window.location.origin}/view?id=${createdGift._id}`} size={100} />
                            </div>

                            <p className="font-bold uppercase tracking-widest mt-2">{user.shopName}</p>
                            <p className="text-xs text-gray-500">Scan to watch the message</p>
                        </div>

                        <button onClick={() => window.print()} className="w-full py-3 bg-black text-white rounded font-bold mb-2">
                            🖨️ Chop Etish
                        </button>
                        <button onClick={() => setCreatedGift(null)} className="w-full py-2 text-zinc-500">Yopish</button>
                    </div>
                </div>
            )}

            {/* HISTORY LIST */}
            <h3 className="text-zinc-500 text-sm font-bold mb-4 uppercase tracking-widest">Tarix</h3>
            <div className="space-y-3">
                {gifts.map(g => (
                    <div key={g._id} className="bg-zinc-900 p-4 rounded-xl flex gap-4 items-center border border-zinc-800">
                        <img src={g.thumbnailUrl} className="w-12 h-12 object-cover rounded bg-zinc-800" alt="thumb" />
                        <div className="flex-1">
                            <h4 className="font-bold text-white">{g.clientName}</h4>
                            <p className="text-xs text-zinc-500">PIN: {g.pinCode} • {new Date(g.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => setCreatedGift(g)} className="text-2xl">🖨️</button>
                    </div>
                ))}
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; border: none; }
                }
            `}</style>
        </div>
    );
};

export default ShopDashboard;
