import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';
import { useNavigate } from 'react-router-dom';

const ARExperience = ({ videoUrl: propVideoUrl, targetFile: propTargetFile }) => {
    const navigate = useNavigate();
    const sceneRef = useRef(null);
    const [arReady, setArReady] = useState(false);
    const [arError, setArError] = useState(null);
    const [started, setStarted] = useState(false);
    const [videoRatio, setVideoRatio] = useState(1);
    const [targetFound, setTargetFound] = useState(false);

    // Data State
    const [videoUrl, setVideoUrl] = useState(propVideoUrl);
    const [targetFile, setTargetFile] = useState(propTargetFile);
    const [loadingData, setLoadingData] = useState(!propTargetFile);

    // 1. Fetch Data if not provided via props (Direct Link scenario)
    useEffect(() => {
        if (propTargetFile && propVideoUrl) {
            setVideoUrl(propVideoUrl);
            setTargetFile(propTargetFile);
            setLoadingData(false);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (!id) {
            setArError("ID topilmadi. QR kodni qayta skaner qiling.");
            setLoadingData(false);
            return;
        }

        fetch(`/api/gifts/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                // Cloudinary Optimization
                const optVideo = data.videoUrl.replace('/upload/', '/upload/f_auto,q_auto/');
                setVideoUrl(optVideo);
                setTargetFile(data.targetFile);
            })
            .catch(err => setArError(err.message))
            .finally(() => setLoadingData(false));
    }, [propTargetFile, propVideoUrl]);

    // 2. Handle AR Events & Clean Up
    useEffect(() => {
        if (!started || !targetFile) return;

        const sceneEl = sceneRef.current;
        const videoEl = document.querySelector('#ar-video');

        const onArReady = () => {
            console.log("✅ AR System Ready");
            setArReady(true);
        };
        const onArError = (e) => {
            console.error("❌ AR Error:", e);
            setArError("Kamera xatosi. Iltimos, ruxsat bering.");
        };

        if (sceneEl) {
            sceneEl.addEventListener("arReady", onArReady);
            sceneEl.addEventListener("arError", onArError);
        }

        // Target Events for Play/Pause logic
        const onTargetFound = () => {
            console.log("🎯 Target Found");
            setTargetFound(true);
            if (videoEl) videoEl.play();
        };
        const onTargetLost = () => {
            console.log("💨 Target Lost");
            setTargetFound(false);
            if (videoEl) videoEl.pause();
        };

        // We need to attach these to the target entity, but standard React ref might be tricky inside A-Frame.
        // We'll use a globally accessible interval to check for the element or a specialized component.
        // Simpler approach: Document query once AR is ready.
        const attachTargetEvents = setInterval(() => {
            const targetEl = document.querySelector('[mindar-image-target]');
            if (targetEl) {
                targetEl.addEventListener("targetFound", onTargetFound);
                targetEl.addEventListener("targetLost", onTargetLost);
                clearInterval(attachTargetEvents);
            }
        }, 500);

        return () => {
            if (sceneEl) {
                sceneEl.removeEventListener("arReady", onArReady);
                sceneEl.removeEventListener("arError", onArError);
            }
            clearInterval(attachTargetEvents);
        };
    }, [started, targetFile]);

    // 3. User Interaction (Start)
    const handleStart = () => {
        const v = document.querySelector('#ar-video');
        if (v) {
            v.muted = false; // Unmute
            v.play().then(() => {
                v.pause();
                v.currentTime = 0;
                setStarted(true);
            }).catch(e => alert("Autoplay blocked: " + e.message));
        } else {
            setStarted(true);
        }
    };

    // Metadata Handler
    const handleMetadata = (e) => {
        const { videoWidth, videoHeight } = e.target;
        if (videoWidth && videoHeight) {
            setVideoRatio(videoHeight / videoWidth);
        }
    };

    // --- RENDER HEAVY LIFTING ---
    // We keep the <video> persistent to ensure the 'play' promise isn't broken by unmounting.

    return (
        <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 0 }}>
            {/* --- GLOBAL CSS FIXES --- */}
            <style>{`
                html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: black; }
                .mindar-ui-overlay { display: none !important; }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4); transform: scale(1); }
                    50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.6); transform: scale(1.05); }
                }
                .btn-premium {
                    animation: pulse-glow 2s infinite ease-in-out;
                }
            `}</style>

            {/* 1. PERSISTENT VIDEO ELEMENT (The Core) */}
            {/* Hidden but active for A-Frame texture */}
            <video
                id="ar-video"
                src={videoUrl}
                className="absolute opacity-0 pointer-events-none top-0 left-0"
                preload="auto"
                playsInline
                loop
                crossOrigin="anonymous"
                onLoadedMetadata={handleMetadata}
            ></video>

            {/* 2. LOADING STATE */}
            {loadingData && (
                <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-pinhan-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-pinhan-gold tracking-widest text-xs">MA'LUMOTLAR YUKLANMOQDA...</p>
                </div>
            )}

            {/* 3. ERROR STATE */}
            {!loadingData && arError && (
                <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <h1 className="text-red-500 text-3xl font-black mb-4 uppercase italic">Xatolik</h1>
                    <p className="text-zinc-400 mb-8 max-w-xs">{arError}</p>
                    <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-xl font-bold transition-transform hover:scale-105">Qayta Yuklash</button>
                    <button onClick={() => navigate('/')} className="mt-4 text-zinc-500 underline text-sm">Bosh sahifaga qaytish</button>
                </div>
            )}

            {/* 4. START SCREEN (Gatekeeper) */}
            {!loadingData && !arError && !started && (
                <div className="absolute inset-0 z-[5000] bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none"></div>

                    <img src="/logo.png" alt="logo" className="w-28 mb-8 opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                    <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter italic">Pinhan <span className="text-pinhan-gold">AR</span></h1>
                    <p className="text-zinc-500 mb-12 text-sm max-w-[280px] leading-relaxed uppercase tracking-widest font-medium">Kamerani sovg'a qutisiga qarating va sehrni his qiling ✨</p>

                    <button
                        onClick={handleStart}
                        className="btn-premium bg-gradient-to-r from-pinhan-gold to-yellow-600 text-black px-12 py-5 rounded-full font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95"
                    >
                        BOSHLASH 🚀
                    </button>

                    <p className="mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Pinhan Box v4.0</p>
                </div>
            )}

            {/* 5. AR SCENE & OVERLAYS */}
            {!loadingData && !arError && started && (
                <>
                    {/* EXIT BUTTON */}
                    <button
                        onClick={() => window.location.reload()}
                        className="absolute top-6 right-6 z-[1001] w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90"
                    >
                        <span className="text-2xl">✕</span>
                    </button>

                    {/* LOADING OVERLAY (Until AR Ready) */}
                    {!arReady && (
                        <div className="absolute inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center text-white backdrop-blur-xl">
                            <div className="w-16 h-16 border-4 border-pinhan-gold border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="font-black text-pinhan-gold tracking-[0.3em] text-[10px] uppercase">Kamera Tayyorlanmoqda...</p>
                        </div>
                    )}

                    {/* SCAN GUIDE (Refined Bracket) */}
                    {arReady && !targetFound && (
                        <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
                            <div className="w-[75vw] h-[75vw] max-w-[380px] max-h-[380px] border border-white/10 rounded-[40px] relative">
                                {/* Corners with Glow */}
                                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-pinhan-gold -mt-1 -ml-1 rounded-tl-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-pinhan-gold -mt-1 -mr-1 rounded-tr-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-pinhan-gold -mb-1 -ml-1 rounded-bl-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-pinhan-gold -mb-1 -mr-1 rounded-br-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>

                                <div className="absolute -bottom-16 w-full text-center">
                                    <p className="text-white font-black text-xs uppercase tracking-[0.2em] drop-shadow-lg">
                                        Rasmni ramka ichiga oling 🤳
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <a-scene
                        ref={sceneRef}
                        mindar-image={`imageTargetSrc: ${targetFile}; uiLoading: no; uiScanning: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`}
                        color-space="sRGB"
                        renderer="colorManagement: true, physicallyCorrectLights: false; antialias: true;"
                        vr-mode-ui="enabled: false"
                        device-orientation-permission-ui="enabled: false"
                        embedded
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
                    >
                        <a-assets></a-assets>

                        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                        {/* --- ZERO SLIP (Strict Nesting) --- */}
                        <a-entity mindar-image-target="targetIndex: 0">
                            <a-video
                                src="#ar-video"
                                position="0 0 0.1"
                                height={videoRatio}
                                width="1"
                                rotation="0 0 0"
                                loop="true"
                            ></a-video>
                        </a-entity>
                    </a-scene>
                </>
            )}
        </div>
    );
};

export default ARExperience;
