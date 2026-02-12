import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [shops, setShops] = useState([]);
    const [stats, setStats] = useState(null);

    // Modal & Form State
    const [showCreateShop, setShowCreateShop] = useState(false);
    const [newShop, setNewShop] = useState({ shopName: '', username: '', password: '' });

    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [creditAmount, setCreditAmount] = useState(10);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', password: '' });

    // --- DATA FETCHING ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            console.log("Fetching Admin Data...");

            // Parallel Fetch
            const [shopsRes, statsRes] = await Promise.all([
                axios.get('/api/admin/shops', { headers }),
                axios.get('/api/admin/stats', { headers })
            ]);

            console.log("Shops Data:", shopsRes.data);
            console.log("Stats Data:", statsRes.data);

            setShops(shopsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
            if (error.response?.status === 401) {
                toast.error("Sessiya tugadi (401)");
                navigate('/login');
            } else {
                toast.error("Ma'lumot yuklashda xatolik!");
            }
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---
    const handleCreateShop = async () => {
        if (!newShop.shopName || !newShop.username || !newShop.password) {
            toast.error("Barcha maydonlarni to'ldiring!");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/shops', newShop, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Do'kon yaratildi!");
            setShowCreateShop(false);
            setNewShop({ shopName: '', username: '', password: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Xatolik");
        }
    };

    const handleAddCredit = async () => {
        if (!selectedShop) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/admin/shops/${selectedShop._id}/credit`,
                { amount: creditAmount },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Balans to'ldirildi");
            setShowCreditModal(false);
            fetchData();
        } catch (err) {
            toast.error("Xatolik");
        }
    };

    const handleToggleBlock = async (shop) => {
        if (!confirm(`Rostdan ham ${shop.shopName} ni ${shop.isBlocked ? 'OCHMOQCHIMISIZ' : 'BLOKLAMOQCHIMISIZ'}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/toggle-block/${shop._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(shop.isBlocked ? "Do'kon faollashtirildi" : "Do'kon bloklandi");
            fetchData();
        } catch (err) { toast.error("Xatolik"); }
    };

    const handleUpdateCredentials = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/update-credentials/${selectedShop._id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Ma'lumotlar yangilandi");
            setShowEditModal(false);
            setEditForm({ username: '', password: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Xatolik");
        }
    };

    // --- RENDER ---
    if (loading && !stats) return <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">Yuklanmoqda...</div>;

    return (
        <div className="min-h-screen bg-zinc-900 text-white p-6 font-sans">
            <Toaster position="top-right" />

            {/* HEADER */}
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
                <h1 className="text-2xl font-bold text-pinhan-gold uppercase tracking-wider">
                    Admin Dashboard <span className="text-xs text-zinc-500 ml-2">v2.0 Analytics</span>
                </h1>
                <button
                    onClick={() => { localStorage.clear(); navigate('/login'); }}
                    className="bg-red-900/30 hover:bg-red-900/50 text-red-500 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                    CHIQISH
                </button>
            </header>

            {/* 1. ANALYTICS SECTION */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 animate-fade-in">

                    {/* KPI CARDS */}
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black border border-zinc-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Bugungi Savdo</h3>
                            <p className="text-4xl font-black text-white">{stats.todayGifts}</p>
                            <p className="text-xs text-zinc-600 mt-2">Bugun yaratilgan sovg'alar</p>
                        </div>

                        <div className="bg-black border border-zinc-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-pinhan-gold/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Jami Savdo</h3>
                            <p className="text-4xl font-black text-pinhan-gold">{stats.totalGifts}</p>
                            <p className="text-xs text-zinc-600 mt-2">Umumiy sovg'alar soni</p>
                        </div>

                        <div className="bg-black border border-zinc-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Faol Do'konlar</h3>
                            <p className="text-4xl font-black text-green-500">
                                {shops.filter(s => !s.isBlocked).length} <span className="text-xl text-zinc-600">/ {shops.length}</span>
                            </p>
                            <p className="text-xs text-zinc-600 mt-2">Tizimdagi faol akkauntlar</p>
                        </div>
                    </div>

                    {/* CHART */}
                    <div className="md:col-span-3 bg-black border border-zinc-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            📈 Haftalik Dinamika (Last 7 Days)
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.weeklySales}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#555"
                                        fontSize={12}
                                        tickFormatter={str => str.slice(5)}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#555"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                        cursor={{ fill: '#ffffff0a' }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#FFD700"
                                        radius={[4, 4, 0, 0]}
                                        barSize={40}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* LEADERBOARD */}
                    <div className="bg-black border border-zinc-800 p-6 rounded-2xl shadow-lg flex flex-col">
                        <h3 className="text-white font-bold mb-6">🏆 Top 5 Do'kon</h3>
                        <div className="flex-1 overflow-auto">
                            {stats.topShops.length === 0 ? (
                                <p className="text-zinc-600 text-sm text-center py-4">Ma'lumot yo'q</p>
                            ) : (
                                <div className="space-y-4">
                                    {stats.topShops.map((shop, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-black' :
                                                        i === 1 ? 'bg-zinc-400 text-black' :
                                                            i === 2 ? 'bg-orange-700 text-white' : 'bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-200">{shop.name}</p>
                                                    <p className="text-xs text-zinc-500">Sales</p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-bold text-pinhan-gold">{shop.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. SHOP MANAGEMENT SECTION */}
            <div className="mb-6 flex justify-between items-end">
                <h2 className="text-xl font-bold text-white">Barcha Do'konlar</h2>
                <button
                    onClick={() => setShowCreateShop(true)}
                    className="bg-pinhan-gold hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                >
                    + Yangi Do'kon
                </button>
            </div>

            <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-5 font-medium">Do'kon Nomi</th>
                            <th className="p-5 font-medium">Login</th>
                            <th className="p-5 font-medium">Balans</th>
                            <th className="p-5 font-medium">Status</th>
                            <th className="p-5 font-medium text-right">Boshqaruv</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {shops.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-zinc-500">
                                    <p className="mb-2 text-lg">Do'konlar topilmadi 🤷‍♂️</p>
                                    <button onClick={fetchData} className="text-sm text-pinhan-gold underline">Yangilash</button>
                                </td>
                            </tr>
                        ) : shops.map(shop => (
                            <tr key={shop._id} className="group hover:bg-zinc-900/30 transition-colors">
                                <td className="p-5 font-bold text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">store</div>
                                    {shop.shopName}
                                </td>
                                <td className="p-5 text-zinc-400 font-mono text-sm">{shop.username}</td>
                                <td className="p-5">
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${shop.balance < 5 ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-400'}`}>
                                        {shop.balance} CR
                                    </span>
                                </td>
                                <td className="p-5">
                                    <span className={`text-xs font-bold ${shop.isBlocked ? 'text-red-500' : 'text-zinc-500'}`}>
                                        {shop.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleBlock(shop)}
                                            className={`p-2 rounded hover:bg-zinc-800 transition-colors ${shop.isBlocked ? 'text-green-500' : 'text-red-500'}`}
                                            title={shop.isBlocked ? "Faollashtirish" : "Bloklash"}
                                        >
                                            {shop.isBlocked ? "🔓" : "🔒"}
                                        </button>
                                        <button
                                            onClick={() => { setSelectedShop(shop); setShowCreditModal(true); }}
                                            className="p-2 rounded hover:bg-zinc-800 text-green-400 transition-colors"
                                            title="Balans Qo'shish"
                                        >
                                            💰
                                        </button>
                                        <button
                                            onClick={() => { setSelectedShop(shop); setEditForm({ username: shop.username, password: '' }); setShowEditModal(true); }}
                                            className="p-2 rounded hover:bg-zinc-800 text-blue-400 transition-colors"
                                            title="Tahrirlash"
                                        >
                                            ✏️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL: ADD CREDIT */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm border border-zinc-700 shadow-2xl relative">
                        <button onClick={() => setShowCreditModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
                        <h3 className="text-xl font-bold mb-2 text-white">Balans To'ldirish</h3>
                        <p className="text-zinc-500 mb-6">Do'kon: <span className="text-pinhan-gold">{selectedShop?.shopName}</span></p>

                        <div className="flex gap-2 mb-4">
                            {[10, 50, 100].map(amt => (
                                <button key={amt} onClick={() => setCreditAmount(amt)}
                                    className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${creditAmount === amt ? 'bg-pinhan-gold text-black border-pinhan-gold' : 'bg-transparent border-zinc-700 hover:border-zinc-500'}`}>
                                    +{amt}
                                </button>
                            ))}
                        </div>

                        <div className="mb-6">
                            <label className="text-xs text-zinc-500 mb-1 block">Yoki qo'lda kiriting:</label>
                            <input
                                type="number"
                                value={creditAmount}
                                onChange={e => setCreditAmount(e.target.value)}
                                className="w-full bg-black p-4 rounded-lg text-center text-2xl font-bold text-white border border-zinc-700 focus:border-pinhan-gold outline-none"
                            />
                        </div>

                        <button onClick={handleAddCredit} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-green-900/20">
                            TASDIQLASH (+{creditAmount})
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT SHOP */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-zinc-700 shadow-2xl relative">
                        <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
                        <h3 className="text-xl font-bold mb-6 text-white border-b border-zinc-800 pb-4">Do'konni Tahrirlash</h3>
                        <p className="text-zinc-500 mb-4">Do'kon: <span className="text-pinhan-gold">{selectedShop?.shopName}</span></p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Yangi Login (Username)</label>
                                <input
                                    className="w-full bg-black p-4 rounded-xl border border-zinc-700 text-white focus:border-pinhan-gold outline-none"
                                    value={editForm.username}
                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Yangi Parol (Bo'sh qoldirish mumkin)</label>
                                <input
                                    className="w-full bg-black p-4 rounded-xl border border-zinc-700 text-white focus:border-pinhan-gold outline-none"
                                    placeholder="Yangi parol..."
                                    type="password"
                                    value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                />
                                <p className="text-xs text-zinc-600 mt-1">*Faqat o'zgartirmoqchi bo'lsangiz yozing.</p>
                            </div>
                        </div>

                        <button onClick={handleUpdateCredentials} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20">
                            SAQLASH
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE SHOP */}
            {showCreateShop && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-zinc-700 shadow-2xl relative">
                        <button onClick={() => setShowCreateShop(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
                        <h3 className="text-xl font-bold mb-6 text-white border-b border-zinc-800 pb-4">Yangi Do'kon Qo'shish</h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Do'kon Nomi (Brand)</label>
                                <input
                                    className="w-full bg-black p-4 rounded-xl border border-zinc-700 text-white focus:border-pinhan-gold outline-none"
                                    placeholder="Masalan: Flower Shop Tashkent"
                                    value={newShop.shopName}
                                    onChange={e => setNewShop({ ...newShop, shopName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Login (Username)</label>
                                <input
                                    className="w-full bg-black p-4 rounded-xl border border-zinc-700 text-white focus:border-pinhan-gold outline-none"
                                    placeholder="login_name"
                                    value={newShop.username}
                                    onChange={e => setNewShop({ ...newShop, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Parol</label>
                                <input
                                    className="w-full bg-black p-4 rounded-xl border border-zinc-700 text-white focus:border-pinhan-gold outline-none"
                                    placeholder="••••••••"
                                    type="password"
                                    value={newShop.password}
                                    onChange={e => setNewShop({ ...newShop, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button onClick={handleCreateShop} className="w-full bg-pinhan-gold hover:bg-yellow-500 text-black py-4 rounded-xl font-bold transition-colors shadow-lg shadow-yellow-900/20">
                            SAQLASH VA YARATISH
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
