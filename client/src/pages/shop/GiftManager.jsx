import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import QRCode from 'react-qr-code';

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const clr = (active) => (active ? '#2dd4bf' : '#64748b');

const IconHome = ({ a }) => <svg width="22" height="22" fill="none" stroke={clr(a)} strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const IconPlus = ({ a }) => <svg width="22" height="22" fill="none" stroke={clr(a)} strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconGifts = ({ a }) => <svg width="22" height="22" fill="none" stroke={clr(a)} strokeWidth="2" viewBox="0 0 24 24"><path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" /></svg>;
const IconScans = ({ a }) => <svg width="22" height="22" fill="none" stroke={clr(a)} strokeWidth="2" viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12" /><path d="M5 19H3a1 1 0 01-1-1V6a1 1 0 011-1h2" /><path d="M19 5h2a1 1 0 011 1v12a1 1 0 01-1 1h-2" /><rect x="8" y="3" width="8" height="18" rx="1" /></svg>;
const IconUser = ({ a }) => <svg width="22" height="22" fill="none" stroke={clr(a)} strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const IconDL = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IconClose = () => <svg width="20" height="20" fill="none" stroke="#94a3b8" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconTg = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#2dd4bf"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" /></svg>;
const IconPhone = () => <svg width="20" height="20" fill="none" stroke="#34d399" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82 19.79 19.79 0 0110 1.18 2 2 0 0112 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L16.09 8a16 16 0 006.91 6.91l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>;

// ─────────────────────────────────────────────────────────────────────────────
// QR DOWNLOAD HELPER — renders QR to canvas → PNG blob download
// ─────────────────────────────────────────────────────────────────────────────
function downloadQR(giftId, clientName) {
    const svg = document.getElementById(`qr-svg-${giftId}`);
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
        const size = 400;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => {
            const dl = document.createElement('a');
            dl.href = URL.createObjectURL(blob);
            dl.download = `qr-${clientName || 'gift'}.png`;
            dl.click();
        }, 'image/png');
    };
    img.src = url;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT MODAL
// ─────────────────────────────────────────────────────────────────────────────
const ContactModal = ({ onClose }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(14px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#1e293b', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 28, width: '100%', maxWidth: 380, padding: 36, position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}><IconClose /></button>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#2dd4bf,#10b981)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26 }}>💬</div>
                <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Kredit tugadimi?</h2>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Admin bilan bog'laning — tezda to'ldiramiz!</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Phone */}
                <a href="tel:+998979109077" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 16, padding: '16px 20px', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,0.08)'}>
                    <div style={{ width: 40, height: 40, background: 'rgba(52,211,153,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPhone /></div>
                    <div>
                        <p style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3px' }}>Telefon</p>
                        <p style={{ color: '#34d399', fontSize: 16, fontWeight: 700, margin: 0 }}>+998 97 910 90 77</p>
                    </div>
                </a>

                {/* Telegram */}
                <a href="https://t.me/bobur_sadulloev" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 16, padding: '16px 20px', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,212,191,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,212,191,0.08)'}>
                    <div style={{ width: 40, height: 40, background: 'rgba(45,212,191,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTg /></div>
                    <div>
                        <p style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3px' }}>Telegram</p>
                        <p style={{ color: '#2dd4bf', fontSize: 16, fontWeight: 700, margin: 0 }}>@bobur_sadulloev</p>
                    </div>
                </a>
            </div>

            <p style={{ textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 20, marginBottom: 0 }}>Ish vaqti: 09:00 – 22:00 (Toshkent vaqti)</p>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GIFT DETAIL MODAL — shows QR + download
// ─────────────────────────────────────────────────────────────────────────────
const GiftModal = ({ gift, shopName, onClose }) => {
    const qrUrl = `${window.location.origin}/view?id=${gift._id}`;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 28, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', padding: 32, position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(148,163,184,0.08)', border: 'none', borderRadius: 10, padding: 7, cursor: 'pointer', display: 'flex' }}><IconClose /></button>

                {/* Thumbnail */}
                {gift.thumbnailUrl && (
                    <img src={gift.thumbnailUrl} alt={gift.clientName}
                        style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 16, marginBottom: 20, border: '1px solid rgba(148,163,184,0.1)' }} />
                )}

                {/* Name + meta */}
                <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>{gift.clientName || 'Nomsiz Sovg\'a'}</h2>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                    <span style={{ background: 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', padding: '3px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>PIN: {gift.pinCode}</span>
                    <span style={{ color: '#475569', fontSize: 12, padding: '3px 12px', background: 'rgba(148,163,184,0.08)', borderRadius: 8 }}>📅 {new Date(gift.createdAt).toLocaleDateString()}</span>
                    <span style={{ color: '#475569', fontSize: 12, padding: '3px 12px', background: 'rgba(148,163,184,0.08)', borderRadius: 8 }}>👁 {gift.scanCount || 0} skan</span>
                </div>

                {/* QR Code */}
                <div style={{ background: 'white', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, boxShadow: '0 0 32px rgba(45,212,191,0.08)' }}>
                    <QRCode id={`qr-svg-${gift._id}`} value={qrUrl} size={180} />
                    <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 10, marginBottom: 0 }}>{shopName}</p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                    {/* Download QR */}
                    <button
                        onClick={() => downloadQR(gift._id, gift.clientName)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', border: 'none', borderRadius: 14, padding: '14px', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(45,212,191,0.3)', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 30px rgba(45,212,191,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(45,212,191,0.3)'}
                    >
                        <IconDL /> QR Yuklab Olish
                    </button>
                    {/* Print */}
                    <button onClick={() => window.print()} style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 14, cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>
                        🖨️
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// GIFTS GALLERY TAB
// ─────────────────────────────────────────────────────────────────────────────
const GiftsGallery = ({ gifts, shopName, onDelete }) => {
    const [selectedGift, setSelectedGift] = useState(null);
    const [search, setSearch] = useState('');

    const filtered = gifts.filter(g =>
        !search || (g.clientName || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: '0 0 24px' }}>
            {/* Search */}
            <div style={{ padding: '16px 20px 8px' }}>
                <input
                    placeholder="🔍  Sovg'a qidirish..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.1)', color: '#f1f5f9', padding: '12px 16px', borderRadius: 14, outline: 'none', fontSize: 14, boxSizing: 'border-box' }}
                />
            </div>

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '64px 20px', color: '#334155' }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>🎁</div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#475569' }}>{search ? 'Hech narsa topilmadi' : 'Hali sovg\'alar yo\'q'}</p>
                    <p style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>Birinchi sovg'ani yarating</p>
                </div>
            )}

            {/* GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, padding: '12px 20px' }}>
                {filtered.map(gift => (
                    <div
                        key={gift._id}
                        onClick={() => setSelectedGift(gift)}
                        style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.22s', position: 'relative' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(45,212,191,0.35)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        {/* Thumbnail */}
                        <div style={{ position: 'relative', paddingTop: '90%', background: '#0f172a', overflow: 'hidden' }}>
                            {gift.thumbnailUrl
                                ? <img src={gift.thumbnailUrl} alt={gift.clientName} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎁</div>
                            }
                            {/* Scan count badge */}
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '2px 8px', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                👁 {gift.scanCount || 0}
                            </div>
                        </div>
                        {/* Info */}
                        <div style={{ padding: '12px 12px 14px' }}>
                            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gift.clientName || 'Nomsiz'}</p>
                            <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{new Date(gift.createdAt).toLocaleDateString()}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                <span style={{ background: 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>PIN: {gift.pinCode}</span>
                                <button
                                    onClick={e => { e.stopPropagation(); if (window.confirm(`"${gift.clientName || 'Bu sovg\'a'}"ni o'chirasizmi?`)) onDelete(gift._id); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, padding: 2, lineHeight: 1 }}
                                    title="O'chirish"
                                >🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedGift && <GiftModal gift={selectedGift} shopName={shopName} onClose={() => setSelectedGift(null)} />}

            <style>{`
                @media print {
                    body > *:not(.print-qr) { display: none !important; }
                }
            `}</style>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCANS ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────────────────
const ScansTab = ({ gifts }) => {
    const totalScans = gifts.reduce((s, g) => s + (g.scanCount || 0), 0);
    const activeGifts = gifts.filter(g => (g.scanCount || 0) > 0).length;
    const topGifts = [...gifts].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0)).slice(0, 5);
    const maxScans = topGifts[0]?.scanCount || 1;

    return (
        <div style={{ padding: '20px' }}>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Jami Skanlar', value: totalScans, color: '#2dd4bf', icon: '📡' },
                    { label: 'Faol Sovg\'alar', value: activeGifts, color: '#818cf8', icon: '🎁' },
                    { label: 'Jami Sovg\'alar', value: gifts.length, color: '#fb923c', icon: '📦' },
                ].map(c => (
                    <div key={c.label} style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: '16px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                        <p style={{ color: c.color, fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>{c.value}</p>
                        <p style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, lineHeight: 1.3 }}>{c.label}</p>
                    </div>
                ))}
            </div>

            {/* Top gifts bar chart */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 20, padding: 20, marginBottom: 20 }}>
                <h3 style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: '0 0 18px' }}>
                    🏆 Top Skanlanganlar
                </h3>
                {topGifts.length === 0 && (
                    <p style={{ color: '#334155', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Hali skanlar yo'q</p>
                )}
                {topGifts.map((g, i) => (
                    <div key={g._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <span style={{ color: '#334155', fontSize: 12, fontWeight: 700, width: 20, textAlign: 'center' }}>#{i + 1}</span>
                        {g.thumbnailUrl
                            ? <img src={g.thumbnailUrl} alt={g.clientName} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 34, height: 34, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎁</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.clientName || 'Nomsiz'}</p>
                            <div style={{ background: 'rgba(15,23,42,0.8)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${((g.scanCount || 0) / maxScans) * 100}%`, background: 'linear-gradient(90deg,#2dd4bf,#10b981)', borderRadius: 6, transition: 'width 0.6s ease' }} />
                            </div>
                        </div>
                        <span style={{ color: '#2dd4bf', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{g.scanCount || 0}</span>
                    </div>
                ))}
            </div>

            {/* Recent activity placeholders */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 20, padding: 20 }}>
                <h3 style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: '0 0 16px' }}>
                    🕐 Oxirgi Faollik
                </h3>
                {topGifts.slice(0, 3).map(g => (
                    <div key={g._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                        <div>
                            <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{g.clientName || 'Nomsiz'}</p>
                            <p style={{ color: '#334155', fontSize: 11, margin: 0 }}>PIN: {g.pinCode}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ color: '#2dd4bf', fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>{g.scanCount || 0} skan</p>
                            <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>● Faol</span>
                        </div>
                    </div>
                ))}
                {topGifts.length === 0 && (
                    <p style={{ color: '#334155', textAlign: 'center', padding: '16px 0', fontSize: 13 }}>Ma'lumot yo'q</p>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ShopDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [gifts, setGifts] = useState([]);
    const [tab, setTab] = useState('home'); // home | create | gifts | scans | profile
    const [showContact, setShowContact] = useState(false);

    // Form state
    const [form, setForm] = useState({ clientName: '', pinCode: '', visibility: 'secret', video: null, image: null, mindFile: null });
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [trackingMode, setTrackingMode] = useState('auto');

    useEffect(() => { fetchData(); }, []);

    // Dynamically load MindAR compiler on demand
    useEffect(() => {
        if (trackingMode !== 'auto') return;
        if (window.MINDAR) return;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
        script.async = true;
        document.body.appendChild(script);
    }, [trackingMode]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [meRes, giftsRes] = await Promise.all([
                axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/shop/gifts', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setUser(meRes.data);
            localStorage.setItem('user', JSON.stringify(meRes.data));
            setGifts(giftsRes.data);
        } catch (err) {
            if (err.response?.status === 401) { localStorage.clear(); navigate('/login'); }
        }
    };

    const _loadImage = file => new Promise((res, rej) => {
        const img = new Image(); img.onload = () => res(img); img.onerror = rej;
        img.src = URL.createObjectURL(file);
    });

    const compileMindFile = async imageFile => {
        if (!window.MINDAR) throw new Error('Compiler not loaded yet');
        const compiler = new window.MINDAR.IMAGE.Compiler();
        await compiler.compileImageTargets([await _loadImage(imageFile)], p => setProgressMsg(`Analiz: ${p.toFixed(1)}%`));
        return new Blob([await compiler.exportData()]);
    };

    const handleCreate = async () => {
        if (!form.clientName) return toast.error('Mijoz ismini kiriting!');
        if (!form.video) return toast.error('Video yuklanmagan!');
        if (!form.image) return toast.error('Rasm yuklanmagan!');
        if (trackingMode === 'manual' && !form.mindFile) return toast.error('.mind fayl yuklanmagan!');
        if (user.balance <= 0) { setShowContact(true); return; }

        setIsGenerating(true);
        setProgressMsg('Yuklanmoqda...');
        const token = localStorage.getItem('token');
        try {
            const fd = new FormData();
            fd.append('clientName', form.clientName);
            fd.append('visibility', form.visibility);
            if (form.pinCode) fd.append('pinCode', form.pinCode);
            fd.append('video', form.video);
            fd.append('image', form.image);
            if (trackingMode === 'auto') {
                setProgressMsg('Avtomatik Analiz (1-2 daq)...');
                fd.append('mindFile', await compileMindFile(form.image), 'targets.mind');
            } else {
                fd.append('mindFile', form.mindFile);
            }
            await axios.post('/api/shop/gifts', fd, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Sovg'a yaratildi! (−1 Credit)");
            setForm({ clientName: '', pinCode: '', visibility: 'secret', video: null, image: null, mindFile: null });
            setTab('gifts');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
        } finally {
            setIsGenerating(false);
            setProgressMsg('');
        }
    };

    const handleDelete = async id => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/shop/gifts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("O'chirildi");
            fetchData();
        } catch { toast.error('Xatolik'); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/login'); };

    const totalScans = gifts.reduce((s, g) => s + (g.scanCount || 0), 0);

    // ── RENDER ──────────────────────────────────────────────────────────────
    return (
        <div className="admin-page">
            <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.12)' } }} />

            {/* MODALS */}
            {showContact && <ContactModal onClose={() => setShowContact(false)} />}

            {/* ── HEADER ── */}
            <header className="admin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Back button — only visible on non-home tabs */}
                    {tab !== 'home' && (
                        <button
                            onClick={() => setTab('home')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', color: '#64748b', fontSize: 12, fontWeight: 700, transition: 'all 0.18s', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)'; }}
                        >
                            {/* Left arrow SVG */}
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Orqaga
                        </button>
                    )}
                    {/* Clickable logo → always goes home */}
                    <div
                        onClick={() => setTab('home')}
                        style={{ cursor: 'pointer' }}
                        title="Bosh sahifa"
                    >
                        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#2dd4bf', margin: 0, transition: 'opacity 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >{user.shopName || 'Shop Panel'}</h1>
                        <p style={{ fontSize: 11, color: '#334155', margin: '2px 0 0' }}>@{user.username}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => setShowContact(true)}
                        style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf', background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        💳 Kredit
                    </button>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: user.balance < 5 ? '#f87171' : '#2dd4bf', lineHeight: 1 }}>{user.balance} CR</span>
                    </div>
                </div>
            </header>

            {/* ── CONTENT ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

                {/* HOME */}
                {tab === 'home' && (
                    <div style={{ padding: 20 }}>
                        {/* Balance Hero */}
                        <div style={{ background: 'linear-gradient(135deg,rgba(45,212,191,0.12),rgba(16,185,129,0.06))', border: '1px solid rgba(45,212,191,0.18)', borderRadius: 24, padding: '24px 24px 20px', marginBottom: 20 }}>
                            <p style={{ color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 6px' }}>Mavjud Balans</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 44, fontWeight: 900, color: user.balance < 5 ? '#f87171' : '#2dd4bf', lineHeight: 1 }}>{user.balance}</span>
                                <span style={{ color: '#334155', fontSize: 15, fontWeight: 600 }}>Credits</span>
                            </div>
                            {user.balance < 5 && (
                                <button onClick={() => setShowContact(true)} style={{ marginTop: 12, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                                    ⚠️ Limit tugayapti! Kredit qo'shing →
                                </button>
                            )}
                        </div>

                        {/* Quick stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('gifts')}>
                                <div className="stat-icon" style={{ color: '#818cf8', background: 'rgba(129,140,248,0.1)' }}>🎁</div>
                                <div className="stat-info"><h4>Sovg'alar</h4><p style={{ color: '#818cf8' }}>{gifts.length}</p></div>
                            </div>
                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('scans')}>
                                <div className="stat-icon" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.1)' }}>📡</div>
                                <div className="stat-info"><h4>Skanlar</h4><p style={{ color: '#fb923c' }}>{totalScans}</p></div>
                            </div>
                        </div>

                        {/* CTA */}
                        <button onClick={() => setTab('create')}
                            style={{ width: '100%', background: 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', border: 'none', borderRadius: 18, padding: '18px 0', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(45,212,191,0.25)', letterSpacing: '-0.3px', marginBottom: 12 }}>
                            ＋ YANGI SOVG'A YARATISH
                        </button>

                        {/* Recent gifts preview */}
                        {gifts.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <p style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: 0 }}>So'nggi sovg'alar</p>
                                    <button onClick={() => setTab('gifts')} style={{ background: 'none', border: 'none', color: '#2dd4bf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Barchasini ko'rish →</button>
                                </div>
                                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                                    {gifts.slice(0, 5).map(g => (
                                        <div key={g._id} style={{ flexShrink: 0, width: 90, background: 'rgba(30,41,59,0.7)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            {g.thumbnailUrl
                                                ? <img src={g.thumbnailUrl} alt={g.clientName} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                                                : <div style={{ height: 80, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎁</div>
                                            }
                                            <p style={{ color: '#94a3b8', fontSize: 10, margin: '6px 8px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.clientName || 'Nomsiz'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CREATE */}
                {tab === 'create' && (
                    <div style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>
                        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>Yangi Sovg'a</h2>

                        {/* Tracking Mode */}
                        <div className="glass" style={{ padding: 16, marginBottom: 20 }}>
                            <label style={{ display: 'block', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Tracking Turi</label>
                            <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', padding: 4, borderRadius: 12 }}>
                                {[['auto', '⚡ Avtomatik'], ['manual', '🛠️ Professional']].map(([mode, label]) => (
                                    <button key={mode} onClick={() => setTrackingMode(mode)}
                                        style={{
                                            flex: 1, padding: '10px 8px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            background: trackingMode === mode ? 'linear-gradient(135deg,#2dd4bf,#10b981)' : 'transparent',
                                            color: trackingMode === mode ? '#0f172a' : '#64748b'
                                        }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Mijoz Ismi *</label>
                            <input placeholder="Masalan: Aziz Karimov" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                            {[['secret', '🔒 SIRLI (1 qurilma)'], ['public', '🌍 OMMAVIY (Cheksiz)']].map(([v, label]) => (
                                <button key={v} onClick={() => setForm({ ...form, visibility: v })}
                                    style={{
                                        padding: '12px 8px', borderRadius: 12, border: `1px solid ${form.visibility === v ? (v === 'public' ? '#34d399' : '#2dd4bf') : 'rgba(148,163,184,0.1)'}`, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        background: form.visibility === v ? (v === 'public' ? 'rgba(52,211,153,0.1)' : 'rgba(45,212,191,0.1)') : 'transparent',
                                        color: form.visibility === v ? (v === 'public' ? '#34d399' : '#2dd4bf') : '#64748b'
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="form-group">
                            <label>PIN Kodi (Ixtiyoriy)</label>
                            <input placeholder="Bo'sh qoldiring — avto" value={form.pinCode} onChange={e => setForm({ ...form, pinCode: e.target.value.toUpperCase() })} />
                        </div>

                        {[
                            { key: 'video', label: '🎬 Video Fayl', accept: 'video/*' },
                            { key: 'image', label: trackingMode === 'auto' ? '🖼️ Marker Rasmi (Analiz uchun)' : "🖼️ Marker Rasmi (Ko'rinish)", accept: 'image/*' },
                            ...(trackingMode === 'manual' ? [{ key: 'mindFile', label: '📦 .mind Fayli', accept: '.mind' }] : [])
                        ].map(({ key, label, accept }) => (
                            <label key={key} style={{ display: 'block', padding: '16px', border: `1.5px dashed ${form[key] ? '#2dd4bf' : 'rgba(148,163,184,0.15)'}`, borderRadius: 14, textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: form[key] ? 'rgba(45,212,191,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                                <span style={{ color: form[key] ? '#2dd4bf' : '#64748b', fontSize: 13, fontWeight: 600 }}>
                                    {label} {form[key] ? `✅ (${form[key].name})` : ''}
                                </span>
                                <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => setForm({ ...form, [key]: e.target.files[0] })} />
                            </label>
                        ))}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button onClick={() => setTab('home')} style={{ flex: 1, padding: 14, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.1)', color: '#94a3b8', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                Bekor qilish
                            </button>
                            <button onClick={handleCreate} disabled={isGenerating}
                                style={{ flex: 2, padding: 14, background: isGenerating ? 'rgba(45,212,191,0.3)' : 'linear-gradient(135deg,#2dd4bf,#10b981)', color: '#0f172a', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: isGenerating ? 'wait' : 'pointer' }}>
                                {isGenerating ? (progressMsg || 'YARATILMOQDA...') : 'YARATISH (−1 CR)'}
                            </button>
                        </div>
                    </div>
                )}

                {/* GIFTS GALLERY */}
                {tab === 'gifts' && (
                    <GiftsGallery gifts={gifts} shopName={user.shopName} onDelete={handleDelete} />
                )}

                {/* SCANS */}
                {tab === 'scans' && <ScansTab gifts={gifts} />}

                {/* PROFILE */}
                {tab === 'profile' && (
                    <div style={{ padding: 20 }}>
                        <div className="glass" style={{ padding: 28, textAlign: 'center', marginBottom: 16 }}>
                            <div style={{ width: 70, height: 70, background: 'linear-gradient(135deg,#2dd4bf,#10b981)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28 }}>🏪</div>
                            <h2 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{user.shopName}</h2>
                            <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>@{user.username}</p>
                        </div>
                        <div className="stat-card" style={{ marginBottom: 12 }}>
                            <div className="stat-icon" style={{ color: '#2dd4bf', background: 'rgba(45,212,191,0.1)' }}>💳</div>
                            <div className="stat-info"><h4>Balans</h4><p style={{ color: user.balance < 5 ? '#f87171' : '#2dd4bf' }}>{user.balance} CR</p></div>
                        </div>
                        <button onClick={() => setShowContact(true)}
                            style={{ width: '100%', marginBottom: 12, padding: '15px', background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)', color: '#2dd4bf', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                            💬 Kredit qo'shish / Aloqa
                        </button>
                        <button onClick={handleLogout} style={{ width: '100%', padding: '15px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                            🚪 Chiqish
                        </button>
                    </div>
                )}
            </div>

            {/* ── CONTACT SUPPORT FLOATING BUTTON (Low balance) ── */}
            {user.balance <= 3 && !showContact && (
                <button
                    onClick={() => setShowContact(true)}
                    style={{
                        position: 'fixed', bottom: 78, right: 16, zIndex: 200,
                        background: 'linear-gradient(135deg,#1e293b,#0f172a)',
                        border: '1.5px solid rgba(45,212,191,0.4)',
                        borderRadius: 16, padding: '10px 16px',
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', boxShadow: '0 0 24px rgba(45,212,191,0.2)',
                        animation: 'pulse-glow 2.5s infinite ease-in-out'
                    }}
                >
                    <span style={{ fontSize: 16 }}>💬</span>
                    <span style={{ color: '#2dd4bf', fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>Kredit tugadimi?<br /><span style={{ color: '#475569', fontWeight: 600 }}>Aloqaga chiqing</span></span>
                </button>
            )}

            {/* ── BOTTOM NAV ── */}
            <nav className="mobile-bottom-nav">
                {[
                    { id: 'home', label: 'Asosiy', icon: <IconHome a={tab === 'home'} /> },
                    { id: 'create', label: 'Yaratish', icon: <IconPlus a={tab === 'create'} /> },
                    { id: 'gifts', label: 'Sovg\'alar', icon: <IconGifts a={tab === 'gifts'} /> },
                    { id: 'scans', label: 'Skanlar', icon: <IconScans a={tab === 'scans'} /> },
                    {
                        id: 'profile', label: 'Profil', icon: <IconUser a={tab === 'profile'} />
                    },
                ].map(({ id, label, icon }) => (
                    <button key={id}
                        className={`mobile-nav-item${tab === id ? ' active' : ''}`}
                        onClick={() => setTab(id)}>
                        <div className={tab === id ? 'nav-icon-bg' : ''}>{icon}</div>
                        {label}
                    </button>
                ))}
            </nav>

            <style>{`
                @keyframes pulse-glow {
                    0%,100% { box-shadow: 0 0 16px rgba(45,212,191,0.15); }
                    50%      { box-shadow: 0 0 32px rgba(45,212,191,0.4); }
                }
                @media print {
                    .mobile-bottom-nav, header, .admin-header { display: none !important; }
                }
                @media (min-width: 769px) {
                    .mobile-bottom-nav { display: none !important; }
                    .admin-page { padding-bottom: 0; }
                }
            `}</style>
        </div>
    );
};

export default ShopDashboard;