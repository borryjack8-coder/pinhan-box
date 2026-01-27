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
            <div className="modal-content glass" style={{ maxWidth: '400px' }}>
                <h3 style={{ marginBottom: '20px' }}>QR Kodni Skanerlang</h3>
                <div id="reader"></div>
                <button onClick={onClose} className="nav-btn" style={{ marginTop: '20px' }}>Yopish</button>
            </div>
        </div>
    );
};

export default QRScanner;
