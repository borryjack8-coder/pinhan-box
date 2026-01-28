import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError, onClose }) => {
    const [permissionError, setPermissionError] = React.useState(false);

    const initScanner = () => {
        setPermissionError(false);
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render((decodedText) => {
            // ... (rest of success logic)
        }, (error) => {
            if (error?.includes("NotAllowedError") || error?.includes("Permission denied")) {
                setPermissionError(true);
            }
            if (onScanError) onScanError(error);
        });

        return scanner;
    };

    useEffect(() => {
        let scanner;
        try {
            scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                // Try to extract ID from URL if it's a URL
                try {
                    const url = new URL(decodedText);
                    const id = url.searchParams.get('id');
                    if (id) {
                        onScanSuccess(id);
                        scanner.clear();
                    } else {
                        // It might be just the ID itself
                        onScanSuccess(decodedText);
                        scanner.clear();
                    }
                } catch (e) {
                    // Not a URL, try as raw ID
                    onScanSuccess(decodedText);
                    scanner.clear();
                }
            }, (error) => {
                // Detection of permission failure
                if (error?.toString().includes("NotAllowedError") || error?.toString().includes("Permission denied")) {
                    setPermissionError(true);
                }
                if (onScanError) onScanError(error);
            });
        } catch (e) {
            console.error("Scanner init error", e);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(error => console.error("Failed to clear scanner", error));
            }
        };
    }, []);

    return (
        <div className="modal-overlay">
            <div className="modal-content glass scanner-modal">
                <div className="scanner-header">
                    <h3>QR Kodni Skanerlang</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Skaner ramkasi ichiga QR kodni joylashtiring</p>
                </div>

                <div className="scanner-container">
                    <div id="reader"></div>
                    {!permissionError && (
                        <div className="scanner-overlay">
                            <div className="scan-frame"></div>
                        </div>
                    )}

                    {permissionError && (
                        <div className="permission-overlay glass">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            <h4>Kameraga ruxsat yo'q</h4>
                            <p>QR kodni skanerlash uchun brauzer sozlamalaridan kameraga ruxsat bering.</p>
                            <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>QAYTA URINISH</button>
                        </div>
                    )}
                </div>

                <div className="scanner-footer">
                    <button onClick={onClose} className="nav-btn">Yopish</button>
                </div>
            </div>

            <style>{`
                .scanner-modal {
                    max-width: 450px !important;
                    padding: 20px !important;
                    overflow: hidden;
                }
                .scanner-container {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1/1;
                    margin: 20px 0;
                    border-radius: 20px;
                    overflow: hidden;
                    background: #000;
                }
                #reader {
                    width: 100% !important;
                    border: none !important;
                }
                #reader video {
                    object-fit: cover !important;
                }
                .scanner-overlay {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }
                .scan-frame {
                    width: 70%;
                    height: 70%;
                    border: 2px solid var(--primary);
                    border-radius: 20px;
                    box-shadow: 0 0 0 1000px rgba(0,0,0,0.5);
                    position: relative;
                }
                .scan-frame::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 2px;
                    background: var(--primary);
                    box-shadow: 0 0 15px var(--primary);
                    animation: scan 2s linear infinite;
                }
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
                #reader__scan_region {
                    background: transparent !important;
                }
                #reader__dashboard {
                    display: none !important;
                }
                .permission-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 20;
                    padding: 30px;
                    text-align: center;
                    background: rgba(0,0,0,0.8);
                }
                .permission-overlay h4 {
                    margin: 15px 0 10px;
                    color: #fff;
                }
                .permission-overlay p {
                    font-size: 13px;
                    color: var(--text-dim);
                    margin-bottom: 20px;
                }
            `}</style>
        </div>
    );
};

export default QRScanner;
