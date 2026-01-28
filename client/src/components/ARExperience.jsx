import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';

const ARExperience = ({ videoUrl: propVideoUrl, targetFile: propTargetFile }) => {
    // --- STATE ---
    const sceneRef = useRef(null);
    const videoRef = useRef(null);
    const [status, setStatus] = useState("Initializing...");
    const [error, setError] = useState(null);

    // Strict Gatekeeper State: User MUST click to unlock
    const [hasInteracted, setHasInteracted] = useState(false);

    // Data Loading State
    const [isLoadingData, setIsLoadingData] = useState(!propTargetFile);
    const [fetchedVideoUrl, setFetchedVideoUrl] = useState(propVideoUrl);
    const [fetchedTargetFile, setFetchedTargetFile] = useState(propTargetFile);
    const [videoHeight, setVideoHeight] = useState(1); // Aspect ratio fix

    // --- 1. DATA FETCHING ---
    useEffect(() => {
        if (propTargetFile && propVideoUrl) {
            setFetchedVideoUrl(propVideoUrl);
            setFetchedTargetFile(propTargetFile);
            setIsLoadingData(false);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (!id) {
            setError("ID topilmadi. Havola noto'g'ri.");
            setIsLoadingData(false);
            return;
        }

        const fetchGift = async () => {
            console.log("🌍 Fetching Gift Data:", id);
            setStatus("Yuklanmoqda...");
            try {
                const res = await fetch(`/api/gifts/${id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Gift not found");

                const optimize = (url) => {
                    if (!url || !url.includes('cloudinary.com')) return url;
                    if (url.includes('/upload/')) return url.replace('/upload/', '/upload/f_auto,q_auto/');
                    return url;
                };

                setFetchedVideoUrl(optimize(data.videoUrl));
                setFetchedTargetFile(data.targetFile);
            } catch (err) {
                console.error("Fetch Error:", err);
                setError(err.message);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchGift();
    }, [propTargetFile, propVideoUrl]);

    // --- 2. GATEKEEPER INTERACTION ---
    const handleUserInteraction = () => {
        const video = document.getElementById('gift-video'); // Direct DOM access for reliability
        if (video) {
            console.log("🔓 Unlocking video playback...");
            video.muted = false;

            // The Chain of Trust: Play -> Pause immediately unlocks the audio context
            video.play()
                .then(() => {
                    video.pause();
                    video.currentTime = 0;
                    console.log("✅ Video unlocked successfully.");
                    setHasInteracted(true); // Reveal Scene
                })
                .catch(e => {
                    console.error("❌ Unlock failed:", e);
                    alert("Videoni ochib bo'lmadi: " + e.message);
                });
        } else {
            // Fallback if video ref is missing (rare)
            setHasInteracted(true);
        }
    };

    // --- 3. A-FRAME EVENT LISTENERS ---
    useEffect(() => {
        if (!hasInteracted || !fetchedTargetFile) return;

        console.log("🚀 Mounting AR Scene...");
        const sceneEl = sceneRef.current;
        const videoEl = document.getElementById('gift-video');

        if (!sceneEl || !videoEl) return;

        const onArReady = () => {
            console.log("✅ AR System Ready");
            setStatus("Kamera Tayyor - Marker qidiring");
        };

        const onTargetFound = () => {
            console.log("🎯 TARGET FOUND - PLAYING VIDEO");
            setStatus("Playing...");
            videoEl.play().catch(e => console.error("Play Error:", e));
        };

        const onTargetLost = () => {
            console.log("💨 TARGET LOST - PAUSING");
            setStatus("Qidirilmoqda...");
            videoEl.pause();
        };

        const onArError = (e) => {
            console.error("AR Error:", e);
            setError("Kamera xatosi: " + (e.detail?.error || "Unknown"));
        };

        // Attach
        sceneEl.addEventListener("arReady", onArReady);
        sceneEl.addEventListener("arError", onArError);
        sceneEl.addEventListener("mindar-image-target-found", onTargetFound);
        sceneEl.addEventListener("mindar-image-target-lost", onTargetLost);

        return () => {
            sceneEl.removeEventListener("arReady", onArReady);
            sceneEl.removeEventListener("arError", onArError);
            sceneEl.removeEventListener("mindar-image-target-found", onTargetFound);
            sceneEl.removeEventListener("mindar-image-target-lost", onTargetLost);
        };
    }, [hasInteracted, fetchedTargetFile]);

    // --- 4. ASPECT RATIO HANDLER ---
    const handleMetadata = (e) => {
        const v = e.target;
        if (v.videoWidth && v.videoHeight) {
            const ratio = v.videoHeight / v.videoWidth;
            console.log(`📏 Video Aspect Ratio: ${ratio}`);
            setVideoHeight(ratio);
        }
    };

    // --- RENDERS ---

    // 1. Loading
    if (isLoadingData) return (
        <div style={styles.fullscreenCenter}>
            <div className="loader" style={styles.spinner}></div>
            <p style={{ marginTop: '20px', color: 'gold' }}>Yuklanmoqda...</p>
        </div>
    );

    // 2. Error
    if (error) return (
        <div style={styles.fullscreenCenter}>
            <h2 style={{ color: 'red' }}>⚠️ XATOLIK</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} style={styles.btn}>Qayta Yuklash</button>
        </div>
    );

    // 3. Gatekeeper (THE FIX)
    if (!hasInteracted) {
        return (
            <div style={{ ...styles.fullscreenCenter, zIndex: 9999, background: 'black' }}>
                <img src="/logo.png" alt="logo" style={{ width: '80px', marginBottom: '30px' }} />
                <h1 style={{ color: 'white', marginBottom: '10px' }}>Tayyormisiz?</h1>
                <p style={{ color: '#aaa', marginBottom: '40px' }}>AR Camera rejimini yoqish</p>

                <button onClick={handleUserInteraction} style={styles.bigBtn}>
                    VIDEONI KO'RISH 🎬
                </button>
            </div>
        );
    }

    // 4. AR Scene
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Transparency Styles inside component to be sure */}
            <style dangerouslySetInnerHTML={{
                __html: `
                video#gift-video { opacity: 0; position:absolute; z-index:-10; } 
                .mindar-ui-overlay { display: none !important; }
            `}} />

            {/* Status Overlay */}
            <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '6px',
                color: '#0f0', fontFamily: 'monospace', fontSize: '12px', pointerEvents: 'none'
            }}>
                STATUS: {status}
            </div>

            <a-scene
                ref={sceneRef}
                mindar-image={`imageTargetSrc: ${fetchedTargetFile}; uiLoading: no; uiScanning: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`}
                color-space="sRGB"
                renderer="colorManagement: true, physicallyCorrectLights: true"
                vr-mode-ui="enabled: false"
                device-orientation-permission-ui="enabled: false"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
            >
                <a-assets>
                    <video
                        id="gift-video"
                        src={fetchedVideoUrl}
                        preload="auto"
                        playsInline
                        webkit-playsinline="true"
                        loop
                        crossOrigin="anonymous"
                        onLoadedMetadata={handleMetadata} // Calc ratio here
                    ></video>
                </a-assets>

                <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                <a-entity mindar-image-target="targetIndex: 0">
                    <a-plane
                        src="#gift-video"
                        position="0 0 0"
                        height={videoHeight}
                        width="1" // MINDAR normalizes target width to 1
                        rotation="0 0 0"
                    ></a-plane>
                </a-entity>
            </a-scene>
        </div>
    );
};

const styles = {
    fullscreenCenter: {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'black', color: 'white', textAlign: 'center', padding: '20px'
    },
    spinner: {
        width: '50px', height: '50px',
        border: '4px solid rgba(255,215,0,0.1)',
        borderTop: '4px solid #FFD700',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    btn: {
        marginTop: '20px', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer'
    },
    bigBtn: {
        padding: '20px 40px', fontSize: '22px', fontWeight: 'bold',
        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
        border: 'none', borderRadius: '50px',
        color: 'black', cursor: 'pointer',
        boxShadow: '0 0 25px rgba(255,215,0,0.4)',
        transform: 'scale(1)', transition: 'transform 0.2s'
    }
};

export default ARExperience;
