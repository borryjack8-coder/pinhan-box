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
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
        chunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Pinhan-Memory-${Date.now()}.webm`;
            a.click();
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
        <div style={{ width: '100%', height: '100%' }}>
            {/* START OVERLAY */}
            {!started && (
                <div style={styles.overlay}>
                    <button onClick={handleStart} style={styles.startButton}>
                        BOSHLASH (START EXPERINCE)
                    </button>
                </div>
            )}

            {/* RECORDING UI */}
            {started && (
                <div style={styles.recContainer}>
                    <button
                        onClick={recording ? stopRecording : startRecording}
                        style={{
                            ...styles.recButton,
                            backgroundColor: recording ? '#ff4444' : '#fff'
                        }}
                    >
                        {recording ? 'STOP' : ''}
                    </button>
                </div>
            )}

            {/* A-FRAME SCENE */}
            {/* Note: In React, we inject the raw HTML or use 'dangerouslySetInnerHTML' if using vanilla string, 
          OR use standard JSX if A-Frame elements are registered. 
          Assuming standard JSX usage for simplicity (requires aframe-react usually, or just raw elements). 
          We'll use raw elements since A-Frame creates custom elements. */}
            {/* We must inject the mindar attributes carefully. */}

            <a-scene
                ref={sceneRef}
                mindar-image={`imageTargetSrc: ${targetFile}; uiLoading: no; uiScanning: no;`}
                color-space="sRGB"
                renderer="colorManagement: true, physicallyCorrectLights: true"
                vr-mode-ui="enabled: false"
                device-orientation-permission-ui="enabled: false"
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
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
        background: 'rgba(0,0,0,0.8)', zIndex: 999,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    },
    startButton: {
        padding: '20px 40px', fontSize: '20px', fontWeight: 'bold',
        background: '#FFD700', border: 'none', borderRadius: '50px',
        cursor: 'pointer'
    },
    recContainer: {
        position: 'fixed', bottom: '30px', left: '0', width: '100%',
        display: 'flex', justifyContent: 'center', zIndex: 999,
        pointerEvents: 'none' // allow click through
    },
    recButton: {
        width: '70px', height: '70px', borderRadius: '50%',
        border: '4px solid white',
        pointerEvents: 'auto', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: '12px'
    }
};

export default ARExperience;
