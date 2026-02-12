import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalGifts: 0,
        todayGifts: 0,
        weeklySales: [],
        todayBreakdown: [],
        shops: []
    });

    // Modals
    const [showCreateShop, setShowCreateShop] = useState(false);
    const [newShop, setNewShop] = useState({ shopName: '', username: '', password: '' });

    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [creditAmount, setCreditAmount] = useState(10);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', password: '' });

    // --- FETCHING ---
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            const res = await axios.get('/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Fetch Error:", err);
            toast.error("Ma'lumot yuklashda xatolik!");
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---
    const handleCreateShop = async () => {
        if (!newShop.shopName || !newShop.username || !newShop.password) return toast.error("Barcha maydonlarni to'ldiring!");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/shops', newShop, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Do'kon yaratildi!");
            setShowCreateShop(false);
            setNewShop({ shopName: '', username: '', password: '' });
            fetchDashboardData();
        } catch (err) { toast.error(err.response?.data?.error || "Xatolik"); }
    };

    const handleAddCredit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/admin/shops/${selectedShop._id}/credit`, { amount: creditAmount }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Balans to'ldirildi");
            setShowCreditModal(false);
            fetchDashboardData();
        } catch (err) { toast.error("Xatolik"); }
    };

    const handleToggleBlock = async (shop) => {
        if (!confirm(`Rostdan ham ${shop.shopName} ni ${shop.isBlocked ? 'OCHMOQCHIMISIZ' : 'BLOKLAMOQCHIMISIZ'}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/toggle-block/${shop._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(shop.isBlocked ? "Do'kon faollashtirildi" : "Do'kon bloklandi");
            fetchDashboardData();
        } catch (err) { toast.error("Xatolik"); }
    };

    const handleUpdateCredentials = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/update-credentials/${selectedShop._id}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Ma'lumotlar yangilandi");
            setShowEditModal(false);
            setEditForm({ username: '', password: '' });
            fetchDashboardData();
        } catch (err) { toast.error(err.response?.data?.error || "Xatolik"); }
    };

    if (loading && !data.shops.length) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Yuklanmoqda...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
            <Toaster position="top-right" />

            {/* HEADER */}
            <header className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-900">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Pinhan <span className="text-pinhan-gold">Box</span></h1>
                    <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase">Admin Management Dashboard v4.0</p>
                </div>
                <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border border-red-500/20">
                    CHIQISH
                </button>
            </header>

            {/* TIER 1: KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full transition-transform group-hover:scale-150"></div>
                    <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Bugungi Savdo</h3>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-black text-white">{data.todayGifts}</p>
                        <span className="text-zinc-600 text-xs mb-2 uppercase font-bold tracking-tighter">ta sovg'a</span>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-3xl shadow-2xl relative overflow-hidden group border-l-pinhan-gold/30 border-l-4">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-pinhan-gold/5 rounded-full transition-transform group-hover:scale-150"></div>
                    <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Jami Savdo</h3>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-black text-pinhan-gold">{data.totalGifts}</p>
                        <span className="text-zinc-600 text-xs mb-2 uppercase font-bold tracking-tighter">umumiy</span>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/5 rounded-full transition-transform group-hover:scale-150"></div>
                    <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Faol Do'konlar</h3>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-black text-green-500">{data.shops.filter(s => !s.isBlocked).length}</p>
                        <span className="text-zinc-600 text-xs mb-2 uppercase font-bold tracking-tighter">/ {data.shops.length} jami</span>
                    </div>
                </div>
            </div>

            {/* TIER 2: PERFORMANCE METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 mb-12">
                {/* Weekly Sales Chart */}
                <div className="lg:col-span-6 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-md">
                    <h3 className="text-lg font-black text-white mb-8 uppercase italic tracking-widest flex items-center gap-3">
                        <span className="w-2 h-8 bg-pinhan-gold rounded-full"></span>
                        Haftalik Dinamika
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.weeklySales}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis dataKey="date" stroke="#444" fontSize={10} tickFormatter={str => str.slice(8)} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontSize: '12px' }} cursor={{ fill: '#ffffff05' }} />
                                <Bar dataKey="count" fill="#EAB308" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Today's Leaders */}
                <div className="lg:col-span-4 bg-zinc-900 p-8 rounded-3xl border border-zinc-800/50 flex flex-col shadow-2xl">
                    <h3 className="text-lg font-black text-white mb-8 uppercase italic tracking-widest flex items-center gap-3">
                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                        Bugungi Peshqadamlar
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                        {(!data.todayBreakdown || data.todayBreakdown.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale">
                                <span className="text-4xl mb-4">🌑</span>
                                <p className="text-xs uppercase font-black tracking-widest">Bugun hali savdo yo'q</p>
                            </div>
                        ) : (
                            data.todayBreakdown.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50 hover:border-zinc-700 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-xs font-black text-zinc-500 border border-zinc-800 group-hover:bg-zinc-800 group-hover:text-zinc-300">
                                            #{i + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-200 text-sm">{item.name}</p>
                                            <p className="text-[10px] text-zinc-600 uppercase tracking-tighter">Bugungi savdo</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-pinhan-gold">
                                        {item.count}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* TIER 3: SHOP MANAGEMENT */}
            <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden mb-10">
                <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-zinc-900 to-zinc-950">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                        <span className="w-2 h-8 bg-green-500 rounded-full"></span>
                        Do'konlar Boshqaruvi
                    </h2>
                    <button onClick={() => setShowCreateShop(true)} className="bg-pinhan-gold hover:bg-yellow-500 text-black font-black py-3.5 px-8 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 text-xs uppercase tracking-widest flex items-center gap-2">
                        <span className="text-lg">+</span> Yangi Do'kon Qo'shish
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-zinc-950 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-5 border-b border-zinc-800">#</th>
                                <th className="px-8 py-5 border-b border-zinc-800">Do'kon Nomi</th>
                                <th className="px-8 py-5 border-b border-zinc-800">Login</th>
                                <th className="px-8 py-5 border-b border-zinc-800">Balans</th>
                                <th className="px-8 py-5 border-b border-zinc-800">Status</th>
                                <th className="px-8 py-5 border-b border-zinc-800 text-right">Harakatlar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {data.shops.map((shop, idx) => (
                                <tr key={shop._id} className="group hover:bg-zinc-950/50 transition-colors">
                                    <td className="px-8 py-6 text-zinc-600 font-bold text-xs">{idx + 1}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs border border-zinc-700 font-black">ST</div>
                                            <span className="font-bold text-white">{shop.shopName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-zinc-500 font-mono text-xs">{shop.username}</td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${shop.balance < 5 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                            {shop.balance} Credits
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${shop.isBlocked ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${shop.isBlocked ? 'text-red-500' : 'text-zinc-500'}`}>
                                                {shop.isBlocked ? 'Blocked' : 'Active'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 pr-2">
                                            <button onClick={() => { setSelectedShop(shop); setShowCreditModal(true); }} className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 text-green-500 flex items-center justify-center hover:bg-green-500/10 hover:border-green-500/30 transition-all font-bold" title="Kredit Qo'shish">💰</button>
                                            <button onClick={() => { setSelectedShop(shop); setEditForm({ username: shop.username, password: '' }); setShowEditModal(true); }} className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 text-blue-500 flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/30 transition-all font-bold" title="Tahrirlash">✏️</button>
                                            <button onClick={() => handleToggleBlock(shop)} className={`w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center transition-all font-bold ${shop.isBlocked ? 'text-zinc-500 hover:bg-zinc-800' : 'text-red-500 hover:bg-red-500/10 hover:border-red-500/30'}`} title={shop.isBlocked ? "Faollashtirish" : "Bloklash"}>{shop.isBlocked ? "🔓" : "🔒"}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}

            {/* CREATE SHOP MODAL */}
            {showCreateShop && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in duration-200">
                    <div className="bg-zinc-900 p-10 rounded-[2.5rem] w-full max-w-lg border border-zinc-800 shadow-[0_0_100px_rgba(0,0,0,1)] relative">
                        <button onClick={() => setShowCreateShop(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">✕</button>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Yangi Do'kon</h3>
                        <p className="text-zinc-500 text-xs mb-8 uppercase tracking-widest">Pinhan Box B2B hamkorlik platformasi</p>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Do'kon Nomi (Brand)</label>
                                <input className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-white focus:border-pinhan-gold outline-none transition-all placeholder:text-zinc-800 font-bold" placeholder="Masalan: Magic Flowers..." value={newShop.shopName} onChange={e => setNewShop({ ...newShop, shopName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Dashboard Login</label>
                                <input className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-white focus:border-pinhan-gold outline-none transition-all placeholder:text-zinc-800 font-mono" placeholder="username" value={newShop.username} onChange={e => setNewShop({ ...newShop, username: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Maxfiy Parol</label>
                                <input className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-white focus:border-pinhan-gold outline-none transition-all placeholder:text-zinc-800" type="password" placeholder="••••••••" value={newShop.password} onChange={e => setNewShop({ ...newShop, password: e.target.value })} />
                            </div>
                        </div>

                        <button onClick={handleCreateShop} className="w-full bg-pinhan-gold hover:bg-yellow-500 text-black py-6 rounded-[1.5rem] font-black uppercase tracking-widest transition-all shadow-2xl shadow-yellow-500/10 hover:scale-[1.02] active:scale-95">
                            DO'KONNI RO'YXATDAN O'TKAZISH
                        </button>
                    </div>
                </div>
            )}

            {/* CREDIT MODAL */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in duration-200">
                    <div className="bg-zinc-900 p-10 rounded-[2.5rem] w-full max-w-sm border border-zinc-800 shadow-2xl relative">
                        <button onClick={() => setShowCreditModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white">✕</button>
                        <h3 className="text-2xl font-black text-white mb-1 uppercase italic">Balans</h3>
                        <p className="text-zinc-500 text-xs mb-8 uppercase tracking-widest">Do'kon: <span className="text-pinhan-gold italic">{selectedShop?.shopName}</span></p>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[10, 50, 100].map(amt => (
                                <button key={amt} onClick={() => setCreditAmount(amt)} className={`py-4 rounded-2xl font-black border transition-all ${creditAmount === amt ? 'bg-pinhan-gold text-black border-pinhan-gold shadow-lg shadow-yellow-500/20' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                                    +{amt}
                                </button>
                            ))}
                        </div>

                        <input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="w-full bg-zinc-950 p-6 rounded-2xl text-center text-4xl font-black text-white border border-zinc-800 focus:border-pinhan-gold outline-none mb-8 shadow-inner" />

                        <button onClick={handleAddCredit} className="w-full bg-green-500 hover:bg-green-400 text-black py-6 rounded-[1.5rem] font-black uppercase tracking-widest transition-all shadow-2xl shadow-green-500/10">
                            TASDIQLASH
                        </button>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in duration-200">
                    <div className="bg-zinc-900 p-10 rounded-[2.5rem] w-full max-w-md border border-zinc-800 shadow-2xl relative">
                        <button onClick={() => setShowEditModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">✕</button>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Tahrir</h3>
                        <p className="text-zinc-500 text-xs mb-10 uppercase tracking-widest">Do'kon: <span className="text-pinhan-gold italic">{selectedShop?.shopName}</span></p>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Yangi Dashboard Login</label>
                                <input className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-white focus:border-pinhan-gold outline-none font-mono" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Yangi Parol</label>
                                <input className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-white focus:border-pinhan-gold outline-none placeholder:text-zinc-800 font-bold" type="password" placeholder="O'zgartirishni xohlasangiz yozing..." value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                            </div>
                        </div>

                        <button onClick={handleUpdateCredentials} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest transition-all">
                            MA'LUMOTLARNI YANGILASH
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
