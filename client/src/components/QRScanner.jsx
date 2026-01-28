import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError, onClose }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
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
        }, onScanError);

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
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
                    <div className="scanner-overlay">
                        <div className="scan-frame"></div>
                    </div>
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
            `}</style>
        </div>
    );
};

export default QRScanner;
