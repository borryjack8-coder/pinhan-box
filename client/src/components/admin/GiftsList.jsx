import React from 'react';

const GiftsList = ({ gifts, onSelect, onDelete, isLoading }) => {
    if (isLoading) {
        return (
            <div className="gifts-grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="gift-card skeleton-card skeleton"></div>
                ))}
            </div>
        );
    }

    // NEW LIST LAYOUT
    return (
        <div className="gifts-list-container" style={{ padding: '20px' }}>
            {gifts.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>Hozircha sovg'alar yo'q</p>}

            {gifts.map(gift => (
                <div
                    key={gift._id}
                    className="glass"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '15px 20px',
                        marginBottom: '15px',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px'
                    }}
                >
                    {/* LEFT: Thumbnail & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        {/* Thumbnail - Requirement 1 */}
                        <img
                            src={gift.thumbnailUrl || '/placeholder.png'}
                            alt={gift.clientName || 'Gift Marker'}
                            style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid #333',
                                background: '#000'
                            }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h4 style={{ margin: 0, color: 'white', fontSize: '16px' }}>{gift.clientName || 'Nomsiz Mijoz'}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="pin-badge" style={{ fontSize: '12px', padding: '2px 8px' }}>PIN: {gift.pinCode}</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                    📅 {new Date(gift.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Scan Stats */}
                        <span style={{ fontSize: '12px', color: '#aaa', marginRight: '10px' }} title="Ko'rishlar soni">
                            👁️ {gift.scanCount || 0}
                        </span>

                        {/* Backup QR Button - Requirement 2 */}
                        <button
                            onClick={() => onSelect(gift)}
                            className="nav-btn"
                            style={{ padding: '8px 15px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            title="Show QR Code"
                        >
                            📱 <span className="hide-mobile">QR Kod</span>
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={() => onDelete(gift._id)}
                            className="btn-icon btn-danger"
                            style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
                            title="O'chirish"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-mobile { display: inline; }
                @media(max-width: 600px) {
                    .hide-mobile { display: none; }
                }
            `}} />
        </div>
    );
};

export default GiftsList;
