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
    const [form, setForm] = useState({
        clientName: '',
        pinCode: '',
        visibility: 'secret',
        video: null,
        image: null,
        mindFile: null
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [createdGift, setCreatedGift] = useState(null);

    // --- 1. INITIAL FETCH ---
    useEffect(() => {
        fetchData();
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

    // --- 3. CREATE GIFT FLOW (MANUAL UPLOAD) ---
    const handleCreate = async () => {
        if (!form.clientName) return alert("Iltimos, Mijoz ismini kiriting!");
        if (!form.video) return alert("Video yuklanmagan!");
        if (!form.image) return alert("Rasm (Marker) yuklanmagan!");
        if (!form.mindFile) return alert("Mind fayl (.mind) yuklanmagan!");

        if (user.balance <= 0) {
            alert("Sizda yetarli limit mavjud emas! Administratorga murojaat qiling.");
            return;
        }

        setIsGenerating(true);
        setProgressMsg("Yuklanmoqda...");
        const token = localStorage.getItem('token');

        try {
            const formData = new FormData();
            formData.append('clientName', form.clientName);
            formData.append('visibility', form.visibility === 'public' ? 'public' : 'secret');
            if (form.pinCode) formData.append('pinCode', form.pinCode);

            // Append Files
            formData.append('video', form.video);
            formData.append('image', form.image);
            formData.append('mindFile', form.mindFile);

            console.log("Sending Gift Data (Multipart)...");

            const createRes = await axios.post('/api/shop/gifts', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log("Gift Created:", createRes.data);
            setCreatedGift(createRes.data.gift);

            alert("Muvaffaqiyatli yaratildi! Balansdan 1 limit yechildi.");
            toast.success("Sovg'a yaratildi (-1 Credit)");

            setIsCreating(false);
            setForm({ clientName: '', pinCode: '', visibility: 'secret', video: null, image: null, mindFile: null });
            fetchData();

        } catch (error) {
            console.error("FULL ERROR:", error);
            const rawError = JSON.stringify(error.response?.data || error.message, null, 2);
            alert("XATOLIK YUZ BERDI:\n\n" + rawError);
        } finally {
            setIsGenerating(false);
            setProgressMsg("");
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

                        {/* Visibility Selection */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setForm({ ...form, visibility: 'secret' })}
                                className={`p-3 rounded border text-xs font-bold ${form.visibility === 'secret' ? 'bg-pinhan-gold text-black border-pinhan-gold' : 'bg-transparent text-zinc-500 border-zinc-700'}`}
                            >
                                🔒 SIRLI (1 Qurilma)
                            </button>
                            <button
                                onClick={() => setForm({ ...form, visibility: 'public' })}
                                className={`p-3 rounded border text-xs font-bold ${form.visibility === 'public' ? 'bg-green-500 text-black border-green-500' : 'bg-transparent text-zinc-500 border-zinc-700'}`}
                            >
                                🌍 HAMMA (Cheksiz)
                            </button>
                        </div>
                        <input
                            placeholder="PIN (Ixtiyoriy)"
                            className="w-full bg-black p-3 rounded border border-zinc-700 focus:border-pinhan-gold outline-none"
                            value={form.pinCode}
                            onChange={e => setForm({ ...form, pinCode: e.target.value })}
                        />

                        {/* File Inputs (Manual Upload) */}
                        <div className="space-y-4">
                            {/* Video Input */}
                            <label className={`block p-4 rounded border text-center cursor-pointer ${form.video ? 'border-green-500 text-green-500' : 'border-dashed border-zinc-600'}`}>
                                <span className="text-sm">🎬 Video Yuklash {form.video && '✅'}</span>
                                <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={e => setForm({ ...form, video: e.target.files[0] })}
                                />
                            </label>

                            {/* Image Input */}
                            <label className={`block p-4 rounded border text-center cursor-pointer ${form.image ? 'border-green-500 text-green-500' : 'border-dashed border-zinc-600'}`}>
                                <span className="text-sm">🖼️ Rasm (Marker) Yuklash {form.image && '✅'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => setForm({ ...form, image: e.target.files[0] })}
                                />
                            </label>

                            {/* Mind File Input */}
                            <label className={`block p-4 rounded border text-center cursor-pointer ${form.mindFile ? 'border-green-500 text-green-500' : 'border-dashed border-zinc-600'}`}>
                                <span className="text-sm">🧠 Mind Fayl (.mind) Yuklash {form.mindFile && '✅'}</span>
                                <input
                                    type="file"
                                    accept=".mind"
                                    className="hidden"
                                    onChange={e => setForm({ ...form, mindFile: e.target.files[0] })}
                                />
                            </label>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded bg-zinc-800">Bekor qilish</button>
                            <button
                                onClick={handleCreate}
                                disabled={isGenerating}
                                className={`flex-1 py-3 rounded text-black font-bold transition-all ${isGenerating ? 'bg-yellow-800 cursor-wait' : 'bg-pinhan-gold'}`}
                            >
                                {isGenerating ? (progressMsg || 'YARATILMOQDA...') : 'YARATISH (-1 CR)'}
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
