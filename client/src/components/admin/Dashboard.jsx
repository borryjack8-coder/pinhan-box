import React from 'react';

// Icon helpers (inline SVG to avoid extra deps)
const IconGift = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const IconScan = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M2 12h20M12 2v20M2 8h4M2 16h4M18 8h4M18 16h4M8 2v4M16 2v4M8 18v4M16 18v4" strokeLinecap="round" />
    </svg>
);
const IconZap = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinejoin="round" />
    </svg>
);

const Dashboard = ({ stats }) => {
    if (!stats) return (
        <div>
            <div className="stats-grid">
                {[1, 2, 3].map(i => (
                    <div key={i} className="stat-card skeleton" style={{ minHeight: 110 }} />
                ))}
            </div>
            <div className="recent-section">
                <div className="skeleton skeleton-title" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: 60, marginBottom: 10, borderRadius: 14 }} />
                ))}
            </div>
        </div>
    );

    const { totalGifts, totalScans, latestGifts } = stats;

    const cards = [
        { icon: <IconGift />, label: "Jami Sovg'alar", value: totalGifts, color: '#2dd4bf' },
        { icon: <IconScan />, label: 'Jami Skanerlashlar', value: totalScans, color: '#818cf8' },
        { icon: <IconZap />, label: 'Faollik', value: 'Yuqori', color: '#fb923c' },
    ];

    return (
        <div className="admin-dashboard">
            {/* STAT CARDS */}
            <div className="stats-grid">
                {cards.map((card, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon" style={{ color: card.color, background: `${card.color}18` }}>
                            {card.icon}
                        </div>
                        <div className="stat-info">
                            <h4>{card.label}</h4>
                            <p style={{ color: card.color }}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* RECENT GIFTS */}
            <div className="recent-section">
                <h3>Oxirgi qo'shilganlar</h3>
                <div className="recent-list">
                    {(!latestGifts || latestGifts.length === 0) && (
                        <p style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>Hozircha ma'lumot yo'q</p>
                    )}
                    {latestGifts?.map(gift => (
                        <div key={gift._id} className="recent-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <img
                                    src={gift.thumbnailUrl || '/placeholder.png'}
                                    alt={gift.clientName}
                                    style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(148,163,184,0.15)' }}
                                    onError={e => e.target.style.display = 'none'}
                                />
                                <div className="recent-info">
                                    <strong>{gift.clientName || 'Nomsiz'}</strong>
                                    <span>📅 {new Date(gift.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <span className="recent-scans">👁 {gift.scanCount || 0} skan</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
