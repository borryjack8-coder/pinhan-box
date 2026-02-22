import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// AFRAME COMPONENT REGISTRATION
// MUST be at module level (runs before any React render / a-scene init).
// Implements "object-fit: cover" for the video texture on the AR plane:
// it calculates UV repeat + offset so the video is CROPPED to fill the
// target plane's aspect ratio without stretching.
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined' && window.AFRAME && !AFRAME.components['fit-texture']) {
    AFRAME.registerComponent('fit-texture', {
        dependencies: ['material'],
        schema: {
            videoW: { type: 'number', default: 1 },
            videoH: { type: 'number', default: 1 },
            targetW: { type: 'number', default: 1 },
            targetH: { type: 'number', default: 1 }
        },
        update: function () {
            const mesh = this.el.getObject3D('mesh');
            if (!mesh) return;
            const material = mesh.material;
            if (!material || !material.map) return;

            const videoRatio = this.data.videoW / this.data.videoH;
            const targetRatio = this.data.targetW / this.data.targetH;

            let repeatX = 1, repeatY = 1, offsetX = 0, offsetY = 0;

            if (videoRatio > targetRatio) {
                // Video is wider → crop sides
                repeatX = targetRatio / videoRatio;
                offsetX = (1 - repeatX) / 2;
            } else {
                // Video is taller → crop top/bottom
                repeatY = videoRatio / targetRatio;
                offsetY = (1 - repeatY) / 2;
            }

            material.map.repeat.set(repeatX, repeatY);
            material.map.offset.set(offsetX, offsetY);
            material.map.needsUpdate = true;
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: load an image and return its natural dimensions
// ─────────────────────────────────────────────────────────────────────────────
function getImageSize(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 1, h: 1 }); // safe fallback
        img.src = url;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ARExperience = ({ videoUrl: propVideoUrl, targetFile: propTargetFile }) => {
    const navigate = useNavigate();
    const sceneRef = useRef(null);
    const [arReady, setArReady] = useState(false);
    const [arError, setArError] = useState(null);
    const [started, setStarted] = useState(false);
    const [targetFound, setTargetFound] = useState(false);

    // Video natural dimensions (for UV-crop calculation)
    const [videoSize, setVideoSize] = useState({ w: 1, h: 1 });
    // Marker/Target image dimensions (for plane geometry)
    const [targetSize, setTargetSize] = useState({ w: 1, h: 1 });
    // Track whether AFRAME component has been registered (MindAR loads async)
    const [aframeReady, setAframeReady] = useState(false);

    // Data State
    const [videoUrl, setVideoUrl] = useState(propVideoUrl);
    const [targetFile, setTargetFile] = useState(propTargetFile);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [loadingData, setLoadingData] = useState(!propTargetFile);

    // ── 1. WAIT FOR AFRAME + REGISTER COMPONENT ──────────────────────────────
    useEffect(() => {
        // mind-ar imports AFRAME synchronously, but just in case we poll:
        const ensureComponent = () => {
            if (window.AFRAME) {
                if (!AFRAME.components['fit-texture']) {
                    AFRAME.registerComponent('fit-texture', {
                        dependencies: ['material'],
                        schema: {
                            videoW: { type: 'number', default: 1 },
                            videoH: { type: 'number', default: 1 },
                            targetW: { type: 'number', default: 1 },
                            targetH: { type: 'number', default: 1 }
                        },
                        update: function () {
                            const mesh = this.el.getObject3D('mesh');
                            if (!mesh) return;
                            const material = mesh.material;
                            if (!material || !material.map) return;

                            const videoRatio = this.data.videoW / this.data.videoH;
                            const targetRatio = this.data.targetW / this.data.targetH;

                            let repeatX = 1, repeatY = 1, offsetX = 0, offsetY = 0;

                            if (videoRatio > targetRatio) {
                                repeatX = targetRatio / videoRatio;
                                offsetX = (1 - repeatX) / 2;
                            } else {
                                repeatY = videoRatio / targetRatio;
                                offsetY = (1 - repeatY) / 2;
                            }

                            material.map.repeat.set(repeatX, repeatY);
                            material.map.offset.set(offsetX, offsetY);
                            material.map.needsUpdate = true;
                        }
                    });
                }
                setAframeReady(true);
                clearInterval(poll);
            }
        };
        const poll = setInterval(ensureComponent, 100);
        ensureComponent(); // try immediately
        return () => clearInterval(poll);
    }, []);

    // ── 2. FETCH DATA ─────────────────────────────────────────────────────────
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
            .then(async data => {
                if (data.error) throw new Error(data.error);
                const optVideo = data.videoUrl.replace('/upload/', '/upload/f_auto,q_auto/');
                setVideoUrl(optVideo);
                setTargetFile(data.mindFileUrl || data.targetFile);

                // Fetch marker image dimensions for the plane geometry
                const thumbUrl = data.thumbnailUrl || data.imageUrl;
                if (thumbUrl) {
                    setThumbnailUrl(thumbUrl);
                    const size = await getImageSize(thumbUrl);
                    setTargetSize(size);
                    console.log(`📐 Target image size: ${size.w}x${size.h}, ratio: ${(size.h / size.w).toFixed(4)}`);
                }
            })
            .catch(err => setArError(err.message))
            .finally(() => setLoadingData(false));
    }, [propTargetFile, propVideoUrl]);

    // ── 3. AR EVENTS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!started || !targetFile) return;

        const sceneEl = sceneRef.current;
        const videoEl = document.querySelector('#ar-video');

        const onArReady = () => { console.log("✅ AR System Ready"); setArReady(true); };
        const onArError = (e) => { console.error("❌ AR Error:", e); setArError("Kamera xatosi. Iltimos, ruxsat bering."); };

        if (sceneEl) {
            sceneEl.addEventListener("arReady", onArReady);
            sceneEl.addEventListener("arError", onArError);
        }

        const onTargetFound = () => { setTargetFound(true); if (videoEl) videoEl.play(); };
        const onTargetLost = () => { setTargetFound(false); if (videoEl) videoEl.pause(); };

        // Poll until the target entity exists
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

    // ── 4. START HANDLER ─────────────────────────────────────────────────────
    const handleStart = () => {
        const v = document.querySelector('#ar-video');
        if (v) {
            v.muted = false;
            v.play()
                .then(() => { v.pause(); v.currentTime = 0; setStarted(true); })
                .catch(e => alert("Autoplay blocked: " + e.message));
        } else {
            setStarted(true);
        }
    };

    // ── 5. VIDEO METADATA HANDLER ─────────────────────────────────────────────
    const handleMetadata = (e) => {
        const { videoWidth, videoHeight } = e.target;
        if (videoWidth && videoHeight) {
            setVideoSize({ w: videoWidth, h: videoHeight });
            console.log(`🎬 Video size: ${videoWidth}x${videoHeight}, ratio: ${(videoHeight / videoWidth).toFixed(4)}`);
        }
    };

    // Derived: plane height = target image aspect ratio (h/w), width always = 1
    // This makes the plane perfectly match the physical printed marker.
    const planeHeight = targetSize.h / targetSize.w;

    // ── 6. RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 0 }}>
            {/* --- GLOBAL CSS FIXES --- */}
            <style>{`
                html, body, #root {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    overflow: hidden !important;
                    position: fixed !important;
                    background: black;
                }
                /* Force MindAR camera video to fill entire screen */
                .mindar-ui-overlay video,
                a-scene video:not(#ar-video) {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    object-fit: cover !important;
                    z-index: -2 !important;
                    display: block !important;
                }
                .mindar-ui-overlay {
                    position: absolute !important;
                    top: 0 !important; left: 0 !important;
                    right: 0 !important; bottom: 0 !important;
                    display: block !important;
                }
                .a-canvas {
                    position: absolute !important;
                    width: 100% !important; height: 100% !important;
                    top: 0 !important; left: 0 !important;
                    z-index: 0 !important;
                    background: transparent !important;
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4); transform: scale(1); }
                    50%       { box-shadow: 0 0 40px rgba(234, 179, 8, 0.6); transform: scale(1.05); }
                }
                .btn-premium { animation: pulse-glow 2s infinite ease-in-out; }
            `}</style>

            {/* PERSISTENT (hidden) VIDEO — A-Frame uses it as a texture source */}
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

            {/* LOADING */}
            {loadingData && (
                <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-pinhan-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-pinhan-gold tracking-widest text-xs">MA'LUMOTLAR YUKLANMOQDA...</p>
                </div>
            )}

            {/* ERROR */}
            {!loadingData && arError && (
                <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <h1 className="text-red-500 text-3xl font-black mb-4 uppercase italic">Xatolik</h1>
                    <p className="text-zinc-400 mb-8 max-w-xs">{arError}</p>
                    <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-xl font-bold transition-transform hover:scale-105">Qayta Yuklash</button>
                    <button onClick={() => navigate('/')} className="mt-4 text-zinc-500 underline text-sm">Bosh sahifaga qaytish</button>
                </div>
            )}

            {/* START SCREEN */}
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
                    <p className="mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Pinhan Box v4.1</p>
                </div>
            )}

            {/* AR SCENE */}
            {!loadingData && !arError && started && (
                <>
                    {/* EXIT */}
                    <button
                        onClick={() => window.location.reload()}
                        className="absolute top-6 right-6 z-[1001] w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90"
                    >
                        <span className="text-2xl">✕</span>
                    </button>

                    {/* CAMERA INIT OVERLAY */}
                    {!arReady && (
                        <div className="absolute inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center text-white backdrop-blur-xl">
                            <div className="w-16 h-16 border-4 border-pinhan-gold border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="font-black text-pinhan-gold tracking-[0.3em] text-[10px] uppercase">Kamera Tayyorlanmoqda...</p>
                        </div>
                    )}

                    {/* SCAN GUIDE */}
                    {arReady && !targetFound && (
                        <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
                            <div className="w-[75vw] h-[75vw] max-w-[380px] max-h-[380px] border border-white/10 rounded-[40px] relative">
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
                        mindar-image={`imageTargetSrc: ${targetFile}; autoStart: true; uiLoading: no; uiScanning: no; uiError: no; filterMinCF:0.0005; filterBeta: 0.01; missTolerance: 10; warmupTolerance: 5;`}
                        color-space="sRGB"
                        renderer="colorManagement: true, physicallyCorrectLights: false; antialias: true;"
                        vr-mode-ui="enabled: false"
                        device-orientation-permission-ui="enabled: false"
                        embedded
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
                    >
                        <a-assets></a-assets>
                        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                        <a-entity mindar-image-target="targetIndex: 0">
                            {/*
                                GEOMETRY: width=1 (MindAR anchor unit), height = target image's h/w ratio.
                                This ensures the plane EXACTLY covers the physical printed marker.

                                fit-texture: custom AFRAME component (see top of file) that applies
                                UV repeat/offset to crop the video like "object-fit: cover",
                                so no matter what the video's own ratio is, it fills the plane without stretch.
                            */}
                            <a-video
                                src="#ar-video"
                                position="0 0 0.001"
                                width="1"
                                height={planeHeight}
                                rotation="0 0 0"
                                loop="true"
                                fit-texture={`videoW: ${videoSize.w}; videoH: ${videoSize.h}; targetW: ${targetSize.w}; targetH: ${targetSize.h}`}
                            ></a-video>
                        </a-entity>
                    </a-scene>
                </>
            )}
        </div>
    );
};

export default ARExperience;
