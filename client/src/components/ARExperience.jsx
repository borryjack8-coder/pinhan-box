import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// AFRAME COMPONENT: mindar-video-cover
//
// Bulletproof "object-fit: cover" for A-Frame video textures.
// - Waits for `loadedmetadata` before reading videoWidth/videoHeight
// - Polls until mesh.material.map is ready before applying UV crop
// - Guards against zero values
// ─────────────────────────────────────────────────────────────────────────────
(function registerMindarVideoCover() {
    if (typeof window === 'undefined' || !window.AFRAME) return;
    if (AFRAME.components['mindar-video-cover']) return;

    AFRAME.registerComponent('mindar-video-cover', {
        schema: {
            videoId: { type: 'string', default: '#ar-video' },
            imageW: { type: 'number', default: 0 },
            imageH: { type: 'number', default: 0 }
        },

        init: function () {
            this.applyCrop = this.applyCrop.bind(this);
            this._retryTimer = null;

            this._tryApply = () => {
                const mesh = this.el.getObject3D('mesh');
                if (!mesh || !mesh.material || !mesh.material.map) {
                    this._retryTimer = setTimeout(this._tryApply, 100);
                    return;
                }
                this.applyCrop();
            };

            this.videoEl = document.querySelector(this.data.videoId);
            if (!this.videoEl) {
                console.error('[mindar-video-cover] Video not found:', this.data.videoId);
                return;
            }

            if (this.videoEl.readyState >= 1) {
                this._tryApply();
            } else {
                this.videoEl.addEventListener('loadedmetadata', () => { this._tryApply(); }, { once: true });
            }
        },

        update: function (oldData) {
            // Re-apply when imageW/imageH arrive from React
            if ((oldData.imageW !== this.data.imageW || oldData.imageH !== this.data.imageH)
                && this.data.imageW && this.data.imageH
                && this.videoEl && this.videoEl.readyState >= 1) {
                this._tryApply && this._tryApply();
            }
        },

        remove: function () {
            clearTimeout(this._retryTimer);
        },

        applyCrop: function () {
            const mesh = this.el.getObject3D('mesh');
            if (!mesh || !mesh.material || !mesh.material.map) return;

            const videoW = this.videoEl.videoWidth;
            const videoH = this.videoEl.videoHeight;
            const targetW = this.data.imageW;
            const targetH = this.data.imageH;

            if (!videoW || !videoH || !targetW || !targetH) {
                console.warn('[mindar-video-cover] Skipping — dimensions not ready:', { videoW, videoH, targetW, targetH });
                return;
            }

            const videoRatio = videoW / videoH;
            const targetRatio = targetW / targetH;

            let repeatX = 1, repeatY = 1, offsetX = 0, offsetY = 0;

            if (videoRatio > targetRatio) {
                // Video wider → crop left/right
                repeatX = targetRatio / videoRatio;
                offsetX = (1 - repeatX) / 2;
            } else {
                // Video taller → crop top/bottom
                repeatY = videoRatio / targetRatio;
                offsetY = (1 - repeatY) / 2;
            }

            const map = mesh.material.map;
            map.repeat.set(repeatX, repeatY);
            map.offset.set(offsetX, offsetY);
            map.needsUpdate = true;

            console.log(`✅ [mindar-video-cover] video:${videoW}x${videoH} target:${targetW}x${targetH} repeat:(${repeatX.toFixed(4)},${repeatY.toFixed(4)}) offset:(${offsetX.toFixed(4)},${offsetY.toFixed(4)})`);
        }
    });
})();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
function getImageSize(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => { console.warn('[getImageSize] Failed:', url); resolve({ w: 0, h: 0 }); };
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
    const [targetSize, setTargetSize] = useState({ w: 0, h: 0 });

    const [videoUrl, setVideoUrl] = useState(propVideoUrl);
    const [targetFile, setTargetFile] = useState(propTargetFile);
    const [loadingData, setLoadingData] = useState(!propTargetFile);

    // ── LOCK BODY SCROLL while AR is mounted ─────────────────────────────────
    useEffect(() => {
        document.body.classList.add('ar-active');
        return () => document.body.classList.remove('ar-active');
    }, []);

    // ── FETCH DATA ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (propTargetFile && propVideoUrl) {
            setVideoUrl(propVideoUrl);
            setTargetFile(propTargetFile);
            setLoadingData(false);
            return;
        }

        const id = new URLSearchParams(window.location.search).get('id');
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

                const thumbUrl = data.thumbnailUrl || data.imageUrl;
                if (thumbUrl) {
                    const size = await getImageSize(thumbUrl);
                    if (size.w && size.h) {
                        setTargetSize(size);
                        console.log(`📐 Target: ${size.w}x${size.h}`);
                    } else {
                        setTargetSize({ w: 1, h: 1 });
                    }
                } else {
                    setTargetSize({ w: 1, h: 1 });
                }
            })
            .catch(err => setArError(err.message))
            .finally(() => setLoadingData(false));
    }, [propTargetFile, propVideoUrl]);

    // ── AR EVENTS ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!started || !targetFile) return;
        const sceneEl = sceneRef.current;
        const videoEl = document.querySelector('#ar-video');

        const onArReady = () => setArReady(true);
        const onArError = () => setArError("Kamera xatosi. Iltimos, ruxsat bering.");

        sceneEl?.addEventListener("arReady", onArReady);
        sceneEl?.addEventListener("arError", onArError);

        const onTargetFound = () => { setTargetFound(true); videoEl?.play(); };
        const onTargetLost = () => { setTargetFound(false); videoEl?.pause(); };

        const poll = setInterval(() => {
            const el = document.querySelector('[mindar-image-target]');
            if (el) { el.addEventListener("targetFound", onTargetFound); el.addEventListener("targetLost", onTargetLost); clearInterval(poll); }
        }, 500);

        return () => {
            sceneEl?.removeEventListener("arReady", onArReady);
            sceneEl?.removeEventListener("arError", onArError);
            clearInterval(poll);
        };
    }, [started, targetFile]);

    // ── START ─────────────────────────────────────────────────────────────
    const handleStart = () => {
        const v = document.querySelector('#ar-video');
        if (v) {
            v.muted = false;
            v.play().then(() => { v.pause(); v.currentTime = 0; setStarted(true); }).catch(e => alert("Autoplay blocked: " + e.message));
        } else { setStarted(true); }
    };

    const planeHeight = (targetSize.w && targetSize.h) ? (targetSize.h / targetSize.w) : 1;

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', zIndex: 0 }}>
            {/* AR-SCOPED CSS — only active when this component is mounted */}
            <style>{`
                /* Camera video fullscreen */
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
                    inset: 0 !important;
                    display: block !important;
                }
                .a-canvas {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 0 !important;
                    background: transparent !important;
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(234,179,8,0.4); transform: scale(1); }
                    50%       { box-shadow: 0 0 40px rgba(234,179,8,0.6); transform: scale(1.05); }
                }
                .btn-premium { animation: pulse-glow 2s infinite ease-in-out; }
            `}</style>

            {/* Persistent hidden <video> texture source */}
            <video
                id="ar-video"
                src={videoUrl}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
                preload="auto"
                playsInline
                loop
                crossOrigin="anonymous"
            />

            {/* LOADING */}
            {loadingData && (
                <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-bold text-yellow-400 tracking-widest text-xs">MA'LUMOTLAR YUKLANMOQDA...</p>
                </div>
            )}

            {/* ERROR */}
            {!loadingData && arError && (
                <div className="absolute inset-0 z-[10000] bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <h1 className="text-red-500 text-3xl font-black mb-4 uppercase">Xatolik</h1>
                    <p className="text-zinc-400 mb-8 max-w-xs">{arError}</p>
                    <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-xl font-bold mb-4">Qayta Yuklash</button>
                    <button onClick={() => navigate('/')} className="text-zinc-500 underline text-sm">Bosh sahifaga qaytish</button>
                </div>
            )}

            {/* START SCREEN */}
            {!loadingData && !arError && !started && (
                <div className="absolute inset-0 z-[5000] bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
                    <img src="/logo.png" alt="logo" className="w-28 mb-8 opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                    <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter italic">Pinhan <span className="text-yellow-400">AR</span></h1>
                    <p className="text-zinc-500 mb-12 text-sm max-w-[280px] leading-relaxed uppercase tracking-widest font-medium">Kamerani sovg'a qutisiga qarating va sehrni his qiling ✨</p>
                    <button onClick={handleStart} className="btn-premium bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-12 py-5 rounded-full font-black text-xl tracking-tighter shadow-2xl transition-all active:scale-95">
                        BOSHLASH 🚀
                    </button>
                    <p className="mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Pinhan Box v4.2</p>
                </div>
            )}

            {/* AR SCENE */}
            {!loadingData && !arError && started && (
                <>
                    <button
                        onClick={() => window.location.reload()}
                        className="absolute top-6 right-6 z-[1001] w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90"
                    >
                        <span className="text-2xl">✕</span>
                    </button>

                    {!arReady && (
                        <div className="absolute inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center text-white backdrop-blur-xl">
                            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-6" />
                            <p className="font-black text-yellow-400 tracking-[0.3em] text-[10px] uppercase">Kamera Tayyorlanmoqda...</p>
                        </div>
                    )}

                    {arReady && !targetFound && (
                        <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
                            <div className="w-[75vw] h-[75vw] max-w-[380px] max-h-[380px] border border-white/10 rounded-[40px] relative">
                                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-yellow-400 -mt-1 -ml-1 rounded-tl-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-yellow-400 -mt-1 -mr-1 rounded-tr-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-yellow-400 -mb-1 -ml-1 rounded-bl-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-yellow-400 -mb-1 -mr-1 rounded-br-[20px] shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                <div className="absolute -bottom-16 w-full text-center">
                                    <p className="text-white font-black text-xs uppercase tracking-[0.2em] drop-shadow-lg">Rasmni ramka ichiga oling 🤳</p>
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
                        <a-assets />
                        <a-camera position="0 0 0" look-controls="enabled: false" />
                        <a-entity mindar-image-target="targetIndex: 0">
                            {/*
                                width=1  → MindAR anchor unit = physical target width
                                height   → target image h/w ratio → plane matches printed marker exactly
                                mindar-video-cover → UV-crops video to fill plane (object-fit: cover)
                                z=0.001  → micro offset prevents z-fighting with marker plane
                            */}
                            <a-video
                                src="#ar-video"
                                position="0 0 0.001"
                                width="1"
                                height={planeHeight}
                                rotation="0 0 0"
                                loop="true"
                                mindar-video-cover={`videoId: #ar-video; imageW: ${targetSize.w}; imageH: ${targetSize.h}`}
                            />
                        </a-entity>
                    </a-scene>
                </>
            )}
        </div>
    );
};

export default ARExperience;
