import React from 'react';

const GiftsList = ({ gifts, onSelect, onDelete, isLoading }) => {
    if (isLoading) {
        return (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gifts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Hozircha sovg'alar yo'q</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Birinchi sovg'ani yarating</p>
                </div>
            )}

            {gifts.map(gift => (
                <div
                    key={gift._id}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 16,
                        padding: '14px 18px',
                        transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.3)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'none'; }}
                >
                    {/* LEFT: Thumbnail + Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                                src={gift.thumbnailUrl || '/placeholder.png'}
                                alt={gift.clientName || 'Gift'}
                                style={{
                                    width: 52, height: 52,
                                    objectFit: 'cover',
                                    borderRadius: 12,
                                    border: '1px solid rgba(148,163,184,0.15)',
                                    background: '#0f172a'
                                }}
                                onError={e => { e.target.src = ''; e.target.style.background = '#1e293b'; }}
                            />
                            {/* Lock indicator */}
                            {gift.boundDeviceId && (
                                <div title="Qurilmaga bog'langan"
                                    style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#f87171', border: '2px solid #0f172a', boxShadow: '0 0 6px #f87171' }}
                                />
                            )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 14, margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {gift.clientName || 'Nomsiz Mijoz'}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span className="pin-badge">PIN: {gift.pinCode}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                    📅 {new Date(gift.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', background: 'rgba(148,163,184,0.08)', padding: '4px 10px', borderRadius: 20 }}>
                            👁 {gift.scanCount || 0}
                        </span>

                        <button
                            onClick={() => onSelect(gift)}
                            className="nav-btn active"
                            style={{ padding: '8px 14px', fontSize: 13 }}
                            title="QR Kod ko'rsatish"
                        >
                            📱 <span className="hide-mobile">QR Kod</span>
                        </button>

                        <button
                            onClick={() => { if (window.confirm(`"${gift.clientName || 'Bu sovg\'a'}"ni o'chirasizmi?`)) onDelete(gift._id); }}
                            style={{
                                background: 'rgba(248,113,113,0.1)',
                                border: '1px solid rgba(248,113,113,0.3)',
                                color: '#f87171',
                                padding: '8px 12px',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontSize: 16,
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                            title="O'chirish"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            ))}

            <style>{`
                .hide-mobile { display: inline; }
                @media(max-width: 600px) { .hide-mobile { display: none; } }
            `}</style>
        </div>
    );
};

export default GiftsList;
