import React, { useEffect, useRef, useState } from 'react';
import 'mind-ar/dist/mindar-image-aframe.prod.js';
// Note: We assume A-Frame is loaded globally in index.html (standard for MindAR + React)

const ARExperience = ({ videoUrl, targetFile }) => {
    const sceneRef = useRef(null);
    const videoRef = useRef(null);
    const [started, setStarted] = useState(false);
    const [recording, setRecording] = useState(false);

    // Recording Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const canvasRef = useRef(null); // The canvas we draw to for recording

    // --- AR TEARDOWN ---
    useEffect(() => {
        return () => {
            // Cleanup MindAR if needed? 
            // MindAR attaches to body, can be messy in React dev HMR.
            // Usually requires a hard reload if component unmounts.
            const scene = sceneRef.current;
            if (scene) {
                // scene.systems['mindar-image-system'].stop(); // Theoretical cleanup
            }
        };
    }, []);

    // --- START LOGIC (Autoplay Fix) ---
    const handleStart = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = false;
            video.play().then(() => {
                video.pause();
                video.currentTime = 0;
                setStarted(true); // Hide overlay
            }).catch(e => console.error("Start Error:", e));
        }
    };

    // --- RECORDING LOGIC ---
    const startRecording = () => {
        // 1. Get Source Canvases
        const scene = sceneRef.current;
        const aCanvas = scene.querySelector('canvas.a-canvas'); // 3D Layer
        const videoFeed = document.querySelector('video'); // Camera Feed (MindAR creates this on body)

        if (!aCanvas || !videoFeed) return alert("Kamera topilmadi!");

        const width = aCanvas.width;
        const height = aCanvas.height;

        // 2. Setup Destination Canvas
        const destCanvas = document.createElement('canvas'); // Offscreen
        destCanvas.width = width;
        destCanvas.height = height;
        const ctx = destCanvas.getContext('2d');
        canvasRef.current = destCanvas;

        // 3. Load Watermark
        const logo = new Image();
        logo.src = "/logo.png"; // Public folder
        logo.crossOrigin = "Anonymous";

        // 4. Animation Loop
        setRecording(true);
        const stream = destCanvas.captureStream(30);

        // Detect supported MIME types for better compatibility (especially iOS)
        const mimeType = MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : MediaRecorder.isTypeSupported('video/quicktime')
                ? 'video/quicktime'
                : 'video/webm;codecs=vp9';

        console.log("Recording with MIME type:", mimeType);

        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            const extension = mimeType.includes('mp4') ? 'mp4' : (mimeType.includes('quicktime') ? 'mov' : 'webm');
            const url = URL.createObjectURL(blob);

            // For iOS we sometimes need to open in new tab or use a specific download flow
            const a = document.createElement('a');
            a.href = url;
            a.download = `Pinhan-Box-${Date.now()}.${extension}`;

            // Necessary for iOS Safari to trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Cleanup memory
            setTimeout(() => URL.revokeObjectURL(url), 100);

            setRecording(false);
        };

        mediaRecorderRef.current.start();

        // 5. Draw Loop
        const draw = () => {
            if (mediaRecorderRef.current.state === 'inactive') return;

            // Draw Camera
            ctx.drawImage(videoFeed, 0, 0, width, height);
            // Draw AR
            ctx.drawImage(aCanvas, 0, 0, width, height);

            // Draw Watermark (Bottom Right)
            if (logo.complete) {
                const logoW = width * 0.2; // 20% width
                const logoH = logoW * (logo.naturalHeight / logo.naturalWidth || 1);
                ctx.drawImage(logo, width - logoW - 20, height - logoH - 20, logoW, logoH);
            }

            requestAnimationFrame(draw);
        };
        draw();
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

            {/* INJECT GLOBAL STYLES FOR CAMERA FEED */}
            <style dangerouslySetInnerHTML={{
                __html: `
                video {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    z-index: -2 !important;
                }
                .a-canvas {
                    z-index: -1 !important;
                }
            `}} />

            {/* START OVERLAY */}
            {!started && (
                <div style={styles.overlay}>
                    <div style={styles.logoContainer}>
                        <img src="/logo.png" alt="Logo" style={styles.logo} />
                    </div>

                    <button onClick={handleStart} style={styles.startButton}>
                        <span>START CAMERA</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </button>

                    <p style={styles.instruction}>Tayyor bo'lsangiz, tugmani bosing</p>
                </div>
            )}

            {/* RECORDING UI */}
            {started && (
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
    logoContainer: {
        width: '100%', maxWidth: '280px', marginBottom: '40px'
    },
    logo: {
        width: '80%', height: 'auto', borderRadius: '24px',
        boxShadow: '0 15px 45px rgba(0,0,0,0.6)'
    },
    startButton: {
        padding: '18px 45px', fontSize: '18px', fontWeight: 'bold',
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#000', border: 'none', borderRadius: '50px',
        cursor: 'pointer', boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)',
        display: 'flex', alignItems: 'center', gap: '12px',
        letterSpacing: '1px'
    },
    instruction: {
        marginTop: '25px', color: 'rgba(255,255,255,0.6)',
        fontSize: '14px', fontWeight: '300'
    },
    recContainer: {
        position: 'fixed', bottom: '40px', left: '0', width: '100%',
        display: 'flex', justifyContent: 'center', zIndex: 1000,
        pointerEvents: 'none'
    },
    recButton: {
        width: '75px', height: '75px', borderRadius: '50%',
        border: '5px solid #fff',
        pointerEvents: 'auto', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: '14px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.4)',
        transition: 'all 0.2s'
    }
};

export default ARExperience;
