import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';

const ARExperience = ({ videoUrl, targetFile }) => {
    const sceneRef = useRef(null);
    const videoRef = useRef(null);
    const [started, setStarted] = useState(false);
    const [recording, setRecording] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [status, setStatus] = useState('Initializing...');

    // Recording Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const canvasRef = useRef(null);

    // --- AR LOGIC ---
    useEffect(() => {
        console.log("AR Mount: ", { targetFile, videoUrl });

        if (!targetFile) {
            setErrorMsg("Target fayli topilmadi!");
            return;
        }

        const sceneEl = sceneRef.current;
        const arSystem = sceneEl?.systems['mindar-image-system'];

        const onTargetFound = () => {
            console.log("🎯 Target Found!");
            setStatus("Target Topildi!");
            if (videoRef.current) {
                videoRef.current.play();
            }
        };

        const onTargetLost = () => {
            console.log("💨 Target Lost");
            setStatus("Karta qidirilmoqda...");
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };

        const onArReady = () => {
            console.log("✅ AR System Ready");
            setStatus("Kamera tayyor");
        };

        const onArError = (event) => {
            console.error("❌ AR Error Event:", event);
            setErrorMsg("AR Xatosi: " + (event.detail?.error || "Noma'lum"));
        };

        if (sceneEl) {
            sceneEl.addEventListener('mindar-image-target-found', onTargetFound);
            sceneEl.addEventListener('mindar-image-target-lost', onTargetLost);
            sceneEl.addEventListener('arReady', onArReady);
            sceneEl.addEventListener('arError', onArError);
        }

        return () => {
            if (sceneEl) {
                sceneEl.removeEventListener('mindar-image-target-found', onTargetFound);
                sceneEl.removeEventListener('mindar-image-target-lost', onTargetLost);
                sceneEl.removeEventListener('arReady', onArReady);
                sceneEl.removeEventListener('arError', onArError);
            }
        };
    }, [targetFile]);

    const handleStart = async () => {
        setErrorMsg('');
        try {
            // Check Permissions Explicitly
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Stop immediately, we just wanted to ask permission
            stream.getTracks().forEach(track => track.stop());

            console.log("✅ Camera Permission Granted");

            const video = videoRef.current;
            if (video) {
                video.muted = false;
                video.play().then(() => {
                    video.pause();
                    video.currentTime = 0;
                    setStarted(true);
                }).catch(e => {
                    console.error("Video Play Error:", e);
                    setErrorMsg("Video xatosi: " + e.message);
                });
            }
        } catch (err) {
            console.error("❌ Camera Permission Denied:", err);
            setErrorMsg("Kameraga ruxsat berilmadi! Iltimos, brauzer sozlamalarini tekshiring.");
        }
    };

    // --- RECORDING LOGIC (Minimally touched, assumed working) ---
    const startRecording = () => {
        try {
            const scene = sceneRef.current;
            const aCanvas = scene.querySelector('canvas.a-canvas');
            const videoFeed = document.querySelector('video');

            if (!aCanvas || !videoFeed) return alert("Kamera tasviri yo'q!");

            const width = aCanvas.width;
            const height = aCanvas.height;
            const destCanvas = document.createElement('canvas');
            destCanvas.width = width;
            destCanvas.height = height;
            const ctx = destCanvas.getContext('2d');
            canvasRef.current = destCanvas;

            const logo = new Image();
            logo.src = "/logo.png";
            logo.crossOrigin = "Anonymous";

            setRecording(true);
            const stream = destCanvas.captureStream(30);

            // Safe Mime Type
            const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
            console.log("Recording Mime:", mimeType);

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Pinhan-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setRecording(false);
            };

            mediaRecorderRef.current.start();

            // Draw Loop
            const draw = () => {
                if (mediaRecorderRef.current.state === 'inactive') return;
                ctx.drawImage(videoFeed, 0, 0, width, height);
                ctx.drawImage(aCanvas, 0, 0, width, height);
                if (logo.complete) {
                    const logoW = width * 0.2;
                    const logoH = logoW * (logo.naturalHeight / logo.naturalWidth || 1);
                    ctx.drawImage(logo, width - logoW - 20, height - logoH - 20, logoW, logoH);
                }
                requestAnimationFrame(draw);
            };
            draw();

        } catch (e) {
            alert("Recording Error: " + e.message);
            setRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

            {/* CSS FIXES */}
            <style dangerouslySetInnerHTML={{
                __html: `
                video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
                .a-canvas { z-index: -1 !important; }
            `}} />

            {/* ERROR / STATUS OVERLAY */}
            {(errorMsg || !started) && (
                <div style={styles.overlay}>
                    {errorMsg ? (
                        <div style={{ color: 'red', textAlign: 'center' }}>
                            <h2>⚠️ XATOLIK</h2>
                            <p>{errorMsg}</p>
                            <button onClick={() => window.location.reload()} style={styles.startButton}>Qayta Yuklash</button>
                        </div>
                    ) : (
                        <>
                            <div style={styles.logoContainer}>
                                <img src="/logo.png" alt="Logo" style={styles.logo} />
                            </div>
                            <button onClick={handleStart} style={styles.startButton}>
                                <span>KAMERANI BOSHLASH</span>
                            </button>
                            <p style={styles.instruction}>Tasdiqlang va kameraga ruxsat bering</p>
                        </>
                    )}
                </div>
            )}

            {/* RECORDING UI */}
            {started && !errorMsg && (
                <>
                    <div style={{ position: 'absolute', top: 20, left: 0, width: '100%', textAlign: 'center', zIndex: 100, color: 'white', textShadow: '0 2px 4px #000' }}>
                        <p>{status}</p>
                    </div>

                    <div style={styles.recContainer}>
                        <button
                            onClick={recording ? stopRecording : startRecording}
                            style={{
                                ...styles.recButton,
                                backgroundColor: recording ? '#ff4444' : 'rgba(255,255,255,0.9)',
                                color: recording ? '#fff' : '#000'
                            }}
                        >
                            {recording ? 'STOP' : 'REC'}
                        </button>
                    </div>
                </>
            )}

            {/* A-FRAME SCENE */}
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
                    <video
                        ref={videoRef}
                        id="ar-video"
                        src={videoUrl}
                        preload="auto"
                        loop
                        crossOrigin="anonymous"
                        playsInline
                        webkit-playsinline="true"
                    ></video>
                </a-assets>

                <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                <a-entity mindar-image-target="targetIndex: 0">
                    <a-plane
                        src="#ar-video"
                        position="0 0 0"
                        height="1" width="1"
                        rotation="0 0 0"
                    ></a-plane>
                </a-entity>
            </a-scene>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(10, 10, 10, 0.95)', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '20px', textAlign: 'center'
    },
    logoContainer: { width: '100%', maxWidth: '280px', marginBottom: '40px' },
    logo: { width: '80%', height: 'auto', borderRadius: '24px', boxShadow: '0 15px 45px rgba(0,0,0,0.6)' },
    startButton: {
        padding: '18px 45px', fontSize: '18px', fontWeight: 'bold',
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#000', border: 'none', borderRadius: '50px',
        cursor: 'pointer', boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)',
        display: 'flex', alignItems: 'center', gap: '12px',
    },
    instruction: { marginTop: '25px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '300' },
    recContainer: {
        position: 'fixed', bottom: '40px', left: '0', width: '100%',
        display: 'flex', justifyContent: 'center', zIndex: 1000, pointerEvents: 'none'
    },
    recButton: {
        width: '75px', height: '75px', borderRadius: '50%', border: '5px solid #fff',
        pointerEvents: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 'bold', fontSize: '14px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.4)', transition: 'all 0.2s'
    }
};

export default ARExperience;
