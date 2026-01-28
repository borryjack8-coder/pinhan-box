import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';
import { toast } from 'react-hot-toast';

const ARExperience = ({ videoUrl: propVideoUrl, targetFile: propTargetFile }) => {
    const sceneRef = useRef(null);
    const videoRef = useRef(null);
    const [status, setStatus] = useState("Initializing...");
    const [error, setError] = useState(null);
    const [started, setStarted] = useState(false);

    // Local State for fetchd data
    const [videoUrl, setVideoUrl] = useState(propVideoUrl);
    const [targetFile, setTargetFile] = useState(propTargetFile);
    const [isLoadingData, setIsLoadingData] = useState(!propTargetFile); // If props are missing, we are loading

    // --- FETCH DATA IF MISSING ---
    useEffect(() => {
        if (propTargetFile && propVideoUrl) {
            setVideoUrl(propVideoUrl);
            setTargetFile(propTargetFile);
            setIsLoadingData(false);
            return;
        }

        // If no props, look for ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (!id) {
            setError("Sovg'a ID topilmadi. Link noto'g'ri.");
            setIsLoadingData(false);
            return;
        }

        const fetchGift = async () => {
            console.log("🌍 Fetching Gift Data for ID:", id);
            setStatus("Ma'lumot yuklanmoqda...");
            try {
                const res = await fetch(`/api/gifts/${id}`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Gift not found");

                console.log("✅ Gift Data Loaded:", data);

                // Cloudinary Optimizer (copied from App.jsx)
                const optimize = (url) => {
                    if (!url || !url.includes('cloudinary.com')) return url;
                    if (url.includes('/upload/')) return url.replace('/upload/', '/upload/f_auto,q_auto/');
                    return url;
                };

                setVideoUrl(optimize(data.videoUrl));
                setTargetFile(data.targetFile);
            } catch (err) {
                console.error("Fetch Error:", err);
                setError("Xatolik: " + err.message);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchGift();

    }, [propTargetFile, propVideoUrl]);

    // --- AR LOGIC ---
    useEffect(() => {
        if (isLoadingData || !targetFile) return;

        console.log("🚀 AR Mount. Target:", targetFile);

        const sceneEl = sceneRef.current;
        if (!sceneEl) return;

        // EVENTS
        const onArReady = () => {
            console.log("✅ AR READY");
            setStatus("Kamera Tayyor");
        };
        const onArError = (e) => {
            console.error("❌ AR ERROR:", e);
            setError("AR Error: " + (e.detail?.error || "Unknown"));
        };
        const onTargetFound = () => {
            console.log("🎯 TARGET FOUND");
            setStatus("Target Topildi!");
            if (videoRef.current) videoRef.current.play();
        };
        const onTargetLost = () => {
            console.log("💨 TARGET LOST");
            setStatus("Qidirilmoqda...");
            if (videoRef.current) videoRef.current.pause();
        };

        sceneEl.addEventListener("arReady", onArReady);
        sceneEl.addEventListener("arError", onArError);
        sceneEl.addEventListener("mindar-image-target-found", onTargetFound);
        sceneEl.addEventListener("mindar-image-target-lost", onTargetLost);

        // Permission Check
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                console.log("✅ Camera Access Granted");
                stream.getTracks().forEach(t => t.stop());
            })
            .catch(err => {
                console.error("❌ Camera Permission Denied:", err);
                setError("Kameraga ruxsat berilmadi!");
            });

        return () => {
            sceneEl.removeEventListener("arReady", onArReady);
            sceneEl.removeEventListener("arError", onArError);
            sceneEl.removeEventListener("mindar-image-target-found", onTargetFound);
            sceneEl.removeEventListener("mindar-image-target-lost", onTargetLost);
        };
    }, [targetFile, isLoadingData]);

    const handleStart = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = false;
            video.play().then(() => {
                video.pause();
                video.currentTime = 0;
                setStarted(true);
            }).catch(e => setError("Video Play Error: " + e.message));
        }
    };

    if (isLoadingData) {
        return (
            <div style={{ width: '100%', height: '100%', background: 'black', color: 'gold', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <div className="loader" style={styles.spinner}></div>
                <p style={{ marginTop: '20px' }}>Yuklanmoqda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ width: '100%', height: '100%', background: 'black', color: 'red', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', textAlign: 'center', padding: '20px' }}>
                <h2>⚠️ XATOLIK</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Qayta Yuklash</button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'black' }}>

            <style dangerouslySetInnerHTML={{
                __html: `
                video { position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:-2; }
                .a-canvas { z-index: -1 !important; }
            `}} />

            {/* STATUS OVERLAY */}
            <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 9999,
                background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '5px',
                color: '#0f0', fontFamily: 'monospace', fontSize: '12px',
                pointerEvents: 'none'
            }}>
                STATUS: {status}
            </div>

            {/* START SCREEN */}
            {!started && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                    <img src="/logo.png" style={{ width: '80px', marginBottom: '20px' }} alt="logo" />
                    <h3>AR KAMERA</h3>
                    <button onClick={handleStart} style={{
                        padding: '15px 40px', fontSize: '18px', fontWeight: 'bold',
                        background: 'gold', border: 'none', borderRadius: '30px', cursor: 'pointer'
                    }}>
                        BOSHLASH
                    </button>
                </div>
            )}

            {/* SCENE */}
            {targetFile && (
                <a-scene
                    ref={sceneRef}
                    mindar-image={`imageTargetSrc: ${targetFile}; uiLoading: no; uiScanning: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`}
                    color-space="sRGB"
                    renderer="colorManagement: true, physicallyCorrectLights: true"
                    vr-mode-ui="enabled: false"
                    device-orientation-permission-ui="enabled: false"
                    style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}
                >
                    <a-assets>
                        <video ref={videoRef} id="ar-video" src={videoUrl} preload="auto" loop crossOrigin="anonymous" playsInline webkit-playsinline="true"></video>
                    </a-assets>
                    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
                    <a-entity mindar-image-target="targetIndex: 0">
                        <a-plane src="#ar-video" position="0 0 0" height="1" width="1" rotation="0 0 0"></a-plane>
                    </a-entity>
                </a-scene>
            )}
        </div>
    );
};

const styles = {
    spinner: {
        width: '50px', height: '50px',
        border: '4px solid rgba(255,215,0,0.1)',
        borderTop: '4px solid #FFD700',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    }
};

export default ARExperience;
