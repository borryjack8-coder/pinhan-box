import React, { useState, useEffect } from 'react';

const SettingsPanel = ({ password }) => {
    const [settings, setSettings] = useState({ telegram: '', instagram: '', phone: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => setSettings(data));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${password}`
                },
                body: JSON.stringify(settings)
            });
            if (res.ok) alert('Sozlamalar saqlandi!');
        } catch (err) {
            alert('Xatolik yuz berdi');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-panel">
            <h3>Kontaktlar va Sozlamalar</h3>
            <div className="settings-form">
                <div className="form-group">
                    <label>Telegram Username</label>
                    <input
                        value={settings.telegram}
                        onChange={e => setSettings({ ...settings, telegram: e.target.value })}
                        placeholder="@username"
                    />
                </div>
                <div className="form-group">
                    <label>Instagram Username</label>
                    <input
                        value={settings.instagram}
                        onChange={e => setSettings({ ...settings, instagram: e.target.value })}
                        placeholder="username"
                    />
                </div>
                <div className="form-group">
                    <label>Telefon Raqam</label>
                    <input
                        value={settings.phone}
                        onChange={e => setSettings({ ...settings, phone: e.target.value })}
                        placeholder="+998..."
                    />
                </div>
                <button onClick={handleSave} disabled={isSaving} className="btn-save">
                    {isSaving ? 'SAQLANMOQDA...' : 'SAQLASH'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPanel;
