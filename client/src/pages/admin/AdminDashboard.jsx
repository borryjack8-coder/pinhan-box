import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [shops, setShops] = useState([]);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', password: '' });

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

    return (
        <div className="min-h-screen bg-zinc-900 text-white p-6">
            <Toaster position="top-right" />

            {/* HEADER */}
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
                <h1 className="text-2xl font-bold text-pinhan-gold uppercase tracking-wider">Do'konlar Boshqaruvi</h1>
                <button
                    onClick={() => { localStorage.clear(); navigate('/login'); }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                    CHIQISH
                </button>
            </header>

            {/* TOP ACTION */}
            <div className="mb-8">
                <button
                    onClick={() => setShowCreateShop(true)}
                    className="bg-pinhan-gold hover:bg-yellow-500 text-black font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex items-center gap-2"
                >
                    <span className="text-xl">+</span> Yangi Do'kon Qo'shish
                </button>
            </div>

            {/* MAIN TABLE */}
            <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-zinc-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-5 font-medium">Do'kon Nomi</th>
                            <th className="p-5 font-medium">Login</th>
                            <th className="p-5 font-medium">Hozirgi Balans</th>
                            <th className="p-5 font-medium">Status</th>
                            <th className="p-5 font-medium">Harakat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {shops.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-zinc-500">Hozircha do'konlar yo'q.</td></tr>
                        ) : shops.map(shop => (
                            <tr key={shop._id} className={`transition-colors group ${shop.isBlocked ? 'bg-red-900/10' : 'hover:bg-zinc-900/40'}`}>
                                <td className="p-5 font-bold text-white text-lg flex items-center gap-2">
                                    {shop.shopName}
                                    {shop.isBlocked && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">BLOCKED</span>}
                                </td>
                                <td className="p-5 text-zinc-400 font-mono">{shop.username}</td>
                                <td className="p-5">
                                    <span className={`inline-block px-3 py-1 rounded-md font-mono font-bold ${shop.balance < 5 ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-400'}`}>
                                        {shop.balance} CR
                                    </span>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleBlock(shop)}
                                            className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${shop.isBlocked ? 'border-green-500 text-green-500 hover:bg-green-500/10' : 'border-red-500 text-red-500 hover:bg-red-500/10'}`}
                                        >
                                            {shop.isBlocked ? "🔓 OCHISH" : "🔒 BLOKLASH"}
                                        </button>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSelectedShop(shop); setShowCreditModal(true); }}
                                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg font-bold text-sm shadow transition-all"
                                            title="Limit Qo'shish"
                                        >
                                            💰
                                        </button>
                                        <button
                                            onClick={() => { setSelectedShop(shop); setEditForm({ username: shop.username, password: '' }); setShowEditModal(true); }}
                                            className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg font-bold text-sm shadow transition-all"
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
                    <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm border border-zinc-700 shadow-2xl">
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

                        <button onClick={handleAddCredit} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold mb-3 transition-colors shadow-lg shadow-green-900/20">
                            TASDIQLASH (+{creditAmount})
                        </button>
                        <button onClick={() => setShowCreditModal(false)} className="w-full bg-transparent hover:bg-zinc-800 text-zinc-400 py-3 rounded-xl transition-colors">
                            Bekor qilish
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT SHOP */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-zinc-700 shadow-2xl">
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
                                <p className="text-xs text-zinc-600 mt-1">*Faat o'zgartirmoqchi bo'lsangiz yozing.</p>
                            </div>
                        </div>

                        <button onClick={handleUpdateCredentials} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold mb-3 transition-colors shadow-lg shadow-blue-900/20">
                            SAQLASH
                        </button>
                        <button onClick={() => setShowEditModal(false)} className="w-full bg-transparent hover:bg-zinc-800 text-zinc-400 py-3 rounded-xl transition-colors">
                            Bekor qilish
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE SHOP (Existing) */}
            {showCreateShop && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-zinc-700 shadow-2xl">
                        <h3 className="text-xl font-bold mb-6 text-white border-b border-zinc-800 pb-4">Yangi Do'kon Ro'yxatdan O'tkazish</h3>

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

                        <button onClick={handleCreateShop} className="w-full bg-pinhan-gold hover:bg-yellow-500 text-black py-4 rounded-xl font-bold mb-3 transition-colors shadow-lg shadow-yellow-900/20">
                            SAQLASH VA YARATISH
                        </button>
                        <button onClick={() => setShowCreateShop(false)} className="w-full bg-transparent hover:bg-zinc-800 text-zinc-400 py-3 rounded-xl transition-colors">
                            Bekor qilish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
