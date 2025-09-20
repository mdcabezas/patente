/* ---------- CONFIG ---------- */
const CROP_WIDTH  = 200;   // ancho del recorte (px) en la resolución real del video
const CROP_HEIGHT = 80;    // alto del recorte (px) en la resolución real del video
/* ---------------------------- */

const video       = document.getElementById('video');
const fullCanvas  = document.getElementById('fullCanvas');
const cropCanvas  = document.getElementById('cropCanvas');
const captureBtn  = document.getElementById('captureBtn');
const clearBtn    = document.getElementById('clearBtn');
const ocrText     = document.getElementById('ocrText');

let stream = null;
let touchX = null;   // coordenadas en **tamaño visual** (clientX)
let touchY = null;

/* 1. Iniciar cámara */
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        video.srcObject = stream;
    } catch (e) {
        alert('No se pudo acceder a la cámara: ' + e.message);
    }
}

/* 2. Capturar coordenadas del toque (en píxeles del elemento visible) */
video.addEventListener('touchstart', e => {
    const rect = video.getBoundingClientRect();
    const touch = e.touches[0];
    touchX = touch.clientX - rect.left;   // posición dentro del video tal como se ve
    touchY = touch.clientY - rect.top;
    drawCropRect();
});

/* 3. Dibujar rectángulo de recorte usando la escala correcta */
function drawCropRect() {
    // Escala entre tamaño visual y tamaño real del flujo
    const scaleX = video.videoWidth  / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    // Convertimos las coordenadas del toque al espacio real del video
    const realX = touchX * scaleX;
    const realY = touchY * scaleY;

    // Ajustamos el canvas de recorte al **tamaño visual** del video
    cropCanvas.width  = video.clientWidth;
    cropCanvas.height = video.clientHeight;
    const ctx = cropCanvas.getContext('2d');
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

    // Calculamos la esquina superior‑izquierda del rectángulo en coordenadas visuales
    const startXVis = Math.max(0, touchX - (CROP_WIDTH / 2) / scaleX);
    const startYVis = Math.max(0, touchY - (CROP_HEIGHT / 2) / scaleY);

    // Dibujamos el rectángulo (visual)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth   = 3;
    ctx.strokeRect(startXVis, startYVis,
        CROP_WIDTH / scaleX, CROP_HEIGHT / scaleY);
}

/* 4. Capturar foto completa y recortar */
captureBtn.addEventListener('click', async () => {
    if (touchX === null || touchY === null) {
        alert('Toca la pantalla sobre la patente antes de capturar.');
        return;
    }

    // Dibujar el frame actual del video en fullCanvas (tamaño real)
    const w = video.videoWidth;
    const h = video.videoHeight;
    fullCanvas.width  = w;
    fullCanvas.height = h;
    const fullCtx = fullCanvas.getContext('2d');
    fullCtx.drawImage(video, 0, 0, w, h);

    // Escala entre visual y real
    const scaleX = w / video.clientWidth;
    const scaleY = h / video.clientHeight;

    // Coordenadas del recorte en la foto real
    const startX = Math.max(0, Math.round(touchX * scaleX - CROP_WIDTH / 2));
    const startY = Math.max(0, Math.round(touchY * scaleY - CROP_HEIGHT / 2));

    // Dibujar recorte en cropCanvas (tamaño del recorte)
    cropCanvas.width  = CROP_WIDTH;
    cropCanvas.height = CROP_HEIGHT;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(
        fullCanvas,
        startX, startY, CROP_WIDTH, CROP_HEIGHT, // origen (foto completa)
        0, 0, CROP_WIDTH, CROP_HEIGHT            // destino (canvas recorte)
    );

    // Convertir a Blob para OCR
    const blob = await new Promise(r => cropCanvas.toBlob(r, 'image/jpeg'));

    /* 5. OCR con Tesseract.js v6 */
    ocrText.textContent = 'Procesando...';
    const worker = Tesseract.createWorker({
        logger: m => console.log(m)   // opcional: ver progreso en consola
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });

    const { data: { text } } = await worker.recognize(blob);
    await worker.terminate();

    ocrText.textContent = text.replace(/\s/g, '').trim();
});

/* 6. Limpiar estado */
clearBtn.addEventListener('click', () => {
    const ctx = cropCanvas.getContext('2d');
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    ocrText.textContent = '';
    touchX = touchY = null;
});

/* Iniciar al cargar la página */
window.addEventListener('load', startCamera);
