import React from 'react';

const Dashboard = ({ stats }) => {
    if (!stats) return <div className="skeleton-dashboard">Yuklanmoqda...</div>;

    const { totalGifts, totalScans, latestGifts } = stats;

    return (
        <div className="admin-dashboard">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🎁</div>
                    <div className="stat-info">
                        <h4>Jami Sovg'alar</h4>
                        <p>{totalGifts}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔍</div>
                    <div className="stat-info">
                        <h4>Jami Skanerlashlar</h4>
                        <p>{totalScans}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-info">
                        <h4>Faollik</h4>
                        <p>Yuqori</p>
                    </div>
                </div>
            </div>

            <section className="recent-section">
                <h3>Oxirgi qo'shilganlar</h3>
                <div className="recent-list">
                    {latestGifts?.map(gift => (
                        <div key={gift._id} className="recent-item">
                            <div className="recent-info">
                                <strong>{gift.clientName || 'Nomsiz'}</strong>
                                <span>{new Date(gift.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="recent-scans">
                                {gift.scanCount || 0} skan
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
