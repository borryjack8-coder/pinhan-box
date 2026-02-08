import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await axios.post('/api/auth/login', { username, password });

            if (res.data.success) {
                const { token, user } = res.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));

                toast.success(`Xush kelibsiz, ${user.shopName || user.username}!`);

                // Role-based Redirect
                setTimeout(() => {
                    if (user.role === 'admin') navigate('/admin');
                    else navigate('/shop');
                }, 800);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Login xatosi');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-pinhan-black text-white p-4">
            <Toaster position="top-center" />

            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="Pinhan" className="h-16 mx-auto mb-4" onError={(e) => e.target.style.display = 'none'} />
                    <h1 className="text-3xl font-bold text-pinhan-gold tracking-wider">PINHAN BOX</h1>
                    <p className="text-zinc-500 mt-2">B2B Partner Platform</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pinhan-gold transition-colors"
                            placeholder="admin or shop name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Parol</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pinhan-gold transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Kirish...' : 'KIRISH'}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-zinc-600">
                    &copy; 2026 Pinhan Box. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Login;
