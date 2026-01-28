import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';

const ARExperience = ({ videoUrl: propVideoUrl, targetFile: propTargetFile }) => {
    const sceneRef = useRef(null);
    const videoRef = useRef(null);
    const [status, setStatus] = useState("Initializing...");
    const [error, setError] = useState(null);

    // Playback State
    const [isVideoStarted, setIsVideoStarted] = useState(false);

    // Dimension State
    const [videoHeight, setVideoHeight] = useState(1); // Default to square, will update on load

    // Local State for fetched data
    const [videoUrl, setVideoUrl] = useState(propVideoUrl);
    const [targetFile, setTargetFile] = useState(propTargetFile);
    const [isLoadingData, setIsLoadingData] = useState(!propTargetFile);

    // --- FETCH DATA IF MISSING ---
    useEffect(() => {
        if (propTargetFile && propVideoUrl) {
            setVideoUrl(propVideoUrl);
            setTargetFile(propTargetFile);
            setIsLoadingData(false);
            return;
        }

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

    // --- AR EVENTS ---
    useEffect(() => {
        if (isLoadingData || !targetFile) return;

        console.log("🚀 AR Mount. Target:", targetFile);

        const sceneEl = sceneRef.current;
        if (!sceneEl) return;

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
            // Only play if we have already started (user interaction occurred)
            if (videoRef.current && isVideoStarted) {
                videoRef.current.play().catch(e => console.warn("Autoplay blocked (retry):", e));
            }
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

        return () => {
            if (sceneEl) {
                sceneEl.removeEventListener("arReady", onArReady);
                sceneEl.removeEventListener("arError", onArError);
                sceneEl.removeEventListener("mindar-image-target-found", onTargetFound);
                sceneEl.removeEventListener("mindar-image-target-lost", onTargetLost);
            }
        };
    }, [targetFile, isLoadingData, isVideoStarted]); // Added isVideoStarted dependency

    // --- RATIO CALCULATION ---
    const handleVideoLoad = (e) => {
        const v = e.target;
        if (v.videoWidth && v.videoHeight) {
            const ratio = v.videoHeight / v.videoWidth;
            console.log(`📏 Video Loaded. Size: ${v.videoWidth}x${v.videoHeight}. Ratio: ${ratio}`);
            setVideoHeight(ratio);
        }
    };

    // --- START INTERACTION ---
    const handleStartClick = () => {
        const video = videoRef.current;
        if (video) {
            // Unlock audio/video with user gesture
            video.muted = false; // Unmute
            video.play()
                .then(() => {
                    console.log("▶️ Video started (unlocked). Pausing until target found.");
                    // We don't pause here if we want to mimic "Tap to View", 
                    // but usually we wait for target.
                    // However, for immediate feedback that it works, we can just leave it playing 
                    // or pause and let targetFound resume it. 
                    // MindAR usually resumes on target found.
                    // Let's Pause it so it doesn't play background audio without visual.
                    video.pause();
                    video.currentTime = 0;
                    setIsVideoStarted(true);
                })
                .catch(err => {
                    console.error("❌ Playback failed:", err);
                    setError("Video xatosi: " + err.message);
                });
        }
    };

    if (isLoadingData) {
        return (
            <div className="center-overlay">
                <div className="loader" style={styles.spinner}></div>
                <p style={{ marginTop: '20px' }}>Yuklanmoqda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="center-overlay" style={{ color: 'red' }}>
                <h3>⚠️ XATOLIK</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-btn">Qayta Yuklash</button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>

            <style dangerouslySetInnerHTML={{
                __html: `
                video { position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:-2; }
                .a-canvas { z-index: -1 !important; }
                .center-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.85); color: white;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    z-index: 2000;
                }
                .retry-btn {
                    margin-top: 20px; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;
                }
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

            {/* TAP TO START OVERLAY */}
            {!isVideoStarted && !isLoadingData && (
                <div className="center-overlay">
                    <img src="/logo.png" style={{ width: '80px', marginBottom: '20px' }} alt="logo" />
                    <h2 style={{ color: 'gold', marginBottom: '10px' }}>Sovg'ani Ko'rish</h2>
                    <p style={{ color: '#aaa', marginBottom: '30px' }}>Kamerani rasmga qarating</p>

                    <button
                        onClick={handleStartClick}
                        style={{
                            padding: '18px 50px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            background: 'gold',
                            border: 'none',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
                        }}
                    >
                        OCHISH
                    </button>
                </div>
            )}

            {/* AR SCENE */}
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
                        {/* Modified Video Tag */}
                        <video
                            ref={videoRef}
                            id="gift-video"
                            src={videoUrl}
                            onLoadedMetadata={handleVideoLoad} // CALCULATE RATIO
                            preload="auto"
                            loop
                            playsInline
                            webkit-playsinline="true"
                            crossOrigin="anonymous"
                        ></video>
                    </a-assets>

                    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                    <a-entity mindar-image-target="targetIndex: 0">
                        {/* Dynamic Height Plane */}
                        <a-plane
                            src="#gift-video"
                            position="0 0 0"
                            height={videoHeight}
                            width="1"
                            rotation="0 0 0"
                        ></a-plane>
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
