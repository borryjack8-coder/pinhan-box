import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';

const ARExperience = ({ videoUrl: propVideoUrl, targetFile: propTargetFile }) => {
    // --- STATE ---
    const sceneRef = useRef(null);
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
            setHasInteracted(true);
        }
    };

    // --- 3. A-FRAME & EVENTS OPTIMIZED ---
    useEffect(() => {
        if (!hasInteracted || !fetchedTargetFile) return;

        console.log("🚀 Mounting AR Scene (Optimized)...");
        const sceneEl = sceneRef.current;
        const videoEl = document.getElementById('gift-video');

        if (!sceneEl || !videoEl) return;

        const onArReady = () => {
            console.log("✅ AR System Ready");
            setStatus("Kamera Tayyor - Marker qidiring");
        };

        const onArError = (e) => {
            console.error("AR Error:", e);
            setError("Kamera xatosi: " + (e.detail?.error || "Unknown"));
        };

        // Attach Scene Events
        sceneEl.addEventListener("arReady", onArReady);
        sceneEl.addEventListener("arError", onArError);

        // ROBUST PLAYBACK LOGIC: Bind directly to the target entity
        // We need to wait for the DOM to be ready with the entity
        const setupTargetEvents = () => {
            const targetEntity = document.querySelector('[mindar-image-target]');
            if (!targetEntity) {
                // Retry if not yet in DOM
                setTimeout(setupTargetEvents, 100);
                return;
            }

            console.log("✅ Target Entity Found - Attaching Listeners");

            targetEntity.addEventListener("targetFound", () => {
                console.log("🎯 TARGET FOUND - FORCING PLAY");
                setStatus("Playing...");
                if (videoEl.paused) {
                    videoEl.play().catch(e => console.error("Force Play Error:", e));
                }
            });

            targetEntity.addEventListener("targetLost", () => {
                console.log("💨 TARGET LOST - PAUSING");
                setStatus("Qidirilmoqda...");
                videoEl.pause();
            });
        };

        setupTargetEvents();

        return () => {
            sceneEl.removeEventListener("arReady", onArReady);
            sceneEl.removeEventListener("arError", onArError);
            // Note: cleaning up the targetEntity listeners is harder since it's inside a closure/timer,
            // but in React effect cleanup, the scene usually gets torn down anyway.
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

    // 3. Gatekeeper
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
        <div id="ar-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden' }}>
            {/* Fix 1: Full Screen CSS - Robust Reset */}
            <style dangerouslySetInnerHTML={{
                __html: `
                html, body { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    width: 100% !important; 
                    height: 100% !important; 
                    overflow: hidden !important; 
                    background: black !important; 
                }
                #root {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                .mindar-ui-overlay { display: none !important; }
                .mindar-viewer-container { 
                    position: absolute !important; 
                    top: 0 !important; 
                    left: 0 !important; 
                    width: 100% !important; 
                    height: 100% !important; 
                    z-index: 0 !important; 
                }
                video#gift-video { opacity: 0; position: fixed; z-index: -99; top: 0; left: 0; }
            `}} />

            {/* Fix 3: UI Update - Transparent Bottom Overlay */}
            <div style={{
                position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                background: 'rgba(0,0,0,0.5)', padding: '12px 24px', borderRadius: '30px',
                color: '#fff', fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 'bold', pointerEvents: 'none',
                backdropFilter: 'blur(5px)', textAlign: 'center', minWidth: '220px', whiteSpace: 'nowrap'
            }}>
                {status === "Kamera Tayyor - Marker qidiring" ? "Kamerani RASMGA tuting 📸" : status}
            </div>

            {/* OPTIMIZED SCENE SETTINGS */}
            <a-scene
                ref={sceneRef}
                mindar-image={`imageTargetSrc: ${fetchedTargetFile}; uiLoading: no; uiScanning: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001; missTolerance: 10;`}
                color-space="sRGB"
                renderer="colorManagement: true, physicallyCorrectLights: false; antialias: false;"
                vr-mode-ui="enabled: false"
                device-orientation-permission-ui="enabled: false"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
                embedded
            >
                <a-assets>
                    <video
                        id="gift-video"
                        src={fetchedVideoUrl}
                        preload="auto"
                        playsInline
                        webkit-playsinline="true"
                        loop="true"
                        autoPlay
                        muted
                        crossOrigin="anonymous"
                        onLoadedMetadata={handleMetadata}
                    ></video>
                </a-assets>

                <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                {/* Fix 2: Alignment (Zero position, Flat Rotation) */}
                <a-entity mindar-image-target="targetIndex: 0">
                    <a-video
                        src="#gift-video"
                        position="0 0 0"
                        height={videoHeight}
                        width="1"
                        rotation="-90 0 0"
                        loop="true"
                    ></a-video>
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
