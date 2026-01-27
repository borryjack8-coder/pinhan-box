import React from 'react';

const GiftsList = ({ gifts, onSelect, onReset, onDelete }) => {
    return (
        <div className="gifts-grid">
            {gifts.map(gift => (
                <div key={gift._id} className="gift-card">
                    <div className="gift-card-header">
                        <span className="pin-badge">{gift.pinCode}</span>
                        <div className={`status-dot ${gift.boundDeviceId ? 'locked' : 'unlocked'}`}></div>
                    </div>

                    <div className="gift-card-body">
                        <h3>{gift.clientName || 'Mijoz nomi'}</h3>
                        <p>Qo'shilgan sana: {new Date(gift.createdAt).toLocaleDateString()}</p>
                        <div className="gift-stats">
                            <span>👁️ {gift.scanCount || 0} marta ko'rilgan</span>
                        </div>
                    </div>

                    <div className="gift-card-actions">
                        <button onClick={() => onSelect(gift)} className="btn-icon" title="QR Kod">📱</button>
                        <button onClick={() => onReset(gift._id)} className="btn-icon" title="Qulfni ochish">🔓</button>
                        <button onClick={() => onDelete(gift._id)} className="btn-icon btn-danger" title="O'chirish">🗑️</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default GiftsList;
