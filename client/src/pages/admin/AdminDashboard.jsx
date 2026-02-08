import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [shops, setShops] = useState([]);
    const [stats, setStats] = useState({});

    // Modal State
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [creditAmount, setCreditAmount] = useState(10);

    // Create Shop State
    const [showCreateShop, setShowCreateShop] = useState(false);
    const [newShop, setNewShop] = useState({ username: '', password: '', shopName: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get('/api/admin/shops', { headers: { Authorization: `Bearer ${token}` } });
            setShops(res.data);
            // Basic stats could be derived or fetched separately
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddCredit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/admin/shops/${selectedShop._id}/credit`, { amount: creditAmount }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Mablag' qo'shildi");
            setShowCreditModal(false);
            fetchData();
        } catch (err) {
            toast.error("Xatolik");
        }
    };

    const handleCreateShop = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/shops', newShop, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Do'kon yaratildi");
            setShowCreateShop(false);
            setNewShop({ username: '', password: '', shopName: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Xatolik");
        }
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-white p-6">
            <Toaster />

            <header className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
                <h1 className="text-2xl font-bold text-pinhan-gold">SUPER ADMIN</h1>
                <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="bg-red-900/30 text-red-400 px-4 py-2 rounded">Chiqish</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* STATS CARD */}
                <div className="bg-black p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-zinc-500 text-sm mb-2">JAMI DO'KONLAR</h3>
                    <p className="text-4xl font-bold">{shops.length}</p>
                </div>
                <div
                    onClick={() => setShowCreateShop(true)}
                    className="bg-pinhan-gold text-black p-6 rounded-2xl cursor-pointer hover:bg-yellow-500 transition-colors flex items-center justify-center font-bold text-xl"
                >
                    + YANGI DO'KON
                </div>
            </div>

            <h2 className="text-xl font-bold mb-4">Mijozlar Ro'yxati</h2>
            <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800">
                <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-zinc-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">Do'kon Nomi</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Balans</th>
                            <th className="p-4">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {shops.map(shop => (
                            <tr key={shop._id} className="hover:bg-zinc-900/50">
                                <td className="p-4 font-bold">{shop.shopName}</td>
                                <td className="p-4 text-zinc-400">{shop.username}</td>
                                <td className={`p-4 font-mono font-bold ${shop.balance < 5 ? 'text-red-500' : 'text-green-400'}`}>
                                    {shop.balance} CR
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => { setSelectedShop(shop); setShowCreditModal(true); }}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                        + Credit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL: ADD CREDIT */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Balans to'ldirish: {selectedShop?.shopName}</h3>
                        <div className="flex gap-2 mb-4">
                            {[10, 50, 100].map(amt => (
                                <button key={amt} onClick={() => setCreditAmount(amt)}
                                    className={`flex-1 py-2 rounded ${creditAmount === amt ? 'bg-pinhan-gold text-black' : 'bg-zinc-800'}`}>
                                    +{amt}
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            value={creditAmount}
                            onChange={e => setCreditAmount(e.target.value)}
                            className="w-full bg-black p-3 rounded mb-4 text-center text-xl font-bold"
                        />
                        <button onClick={handleAddCredit} className="w-full bg-green-600 py-3 rounded font-bold mb-2">TOSHIROQ</button>
                        <button onClick={() => setShowCreditModal(false)} className="w-full bg-zinc-800 py-3 rounded">Yopish</button>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE SHOP */}
            {showCreateShop && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 p-6 rounded-2xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Yangi Do'kon Qo'shish</h3>
                        <div className="space-y-4 mb-6">
                            <input
                                placeholder="Do'kon Nomi (Brand)"
                                className="w-full bg-black p-3 rounded border border-zinc-700"
                                value={newShop.shopName}
                                onChange={e => setNewShop({ ...newShop, shopName: e.target.value })}
                            />
                            <input
                                placeholder="Username (Login)"
                                className="w-full bg-black p-3 rounded border border-zinc-700"
                                value={newShop.username}
                                onChange={e => setNewShop({ ...newShop, username: e.target.value })}
                            />
                            <input
                                placeholder="Parol"
                                className="w-full bg-black p-3 rounded border border-zinc-700"
                                value={newShop.password}
                                onChange={e => setNewShop({ ...newShop, password: e.target.value })}
                            />
                        </div>
                        <button onClick={handleCreateShop} className="w-full bg-pinhan-gold text-black py-3 rounded font-bold mb-2">SAQLASH</button>
                        <button onClick={() => setShowCreateShop(false)} className="w-full bg-zinc-800 py-3 rounded">Yopish</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
