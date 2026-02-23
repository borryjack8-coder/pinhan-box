import React, { useState, useEffect } from 'react';

const SettingsPanel = ({ password }) => {
    const [settings, setSettings] = useState({ telegram: '', instagram: '', phone: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(() => { });
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
                body: JSON.stringify(settings)
            });
            if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
        } catch (err) {
            alert('Xatolik yuz berdi');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-panel">
            <h3>Kontaktlar va Sozlamalar</h3>

            <div style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 14, padding: '12px 16px', marginBottom: 24 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                    Bu sozlamalar mijozlarga ko'rinadigan kontakt ma'lumotlarini belgilaydi.
                </p>
            </div>

            <div className="settings-form">
                {[
                    { key: 'telegram', label: 'Telegram Username', placeholder: '@username', icon: '✈️' },
                    { key: 'instagram', label: 'Instagram Username', placeholder: 'username', icon: '📷' },
                    { key: 'phone', label: 'Telefon Raqam', placeholder: '+998901234567', icon: '📞' },
                ].map(field => (
                    <div key={field.key} className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{field.icon}</span> {field.label}
                        </label>
                        <input
                            type="text"
                            value={settings[field.key] || ''}
                            onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                            placeholder={field.placeholder}
                        />
                    </div>
                ))}

                <button onClick={handleSave} disabled={isSaving} className="btn-save" style={{ marginTop: 8 }}>
                    {isSaving ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <span style={{ width: 16, height: 16, border: '2px solid #0f172a', borderTop: '2px solid transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                            SAQLANMOQDA...
                        </span>
                    ) : saved ? '✅ SAQLANDI!' : '💾 SAQLASH'}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
};

export default SettingsPanel;
