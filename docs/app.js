/* ---------- CONFIG ---------- */
const CROP_WIDTH  = 200;   // ancho del recorte (px)
const CROP_HEIGHT = 80;    // alto del recorte (px)
/* ---------------------------- */

const video       = document.getElementById('video');
const fullCanvas  = document.getElementById('fullCanvas');
const cropCanvas  = document.getElementById('cropCanvas');
const captureBtn  = document.getElementById('captureBtn');
const clearBtn    = document.getElementById('clearBtn');
const ocrText     = document.getElementById('ocrText');

let stream = null;
let touchX = null;
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

/* 2. Capturar coordenadas del toque */
video.addEventListener('touchstart', e => {
    const rect = video.getBoundingClientRect();
    const touch = e.touches[0];
    touchX = touch.clientX - rect.left;
    touchY = touch.clientY - rect.top;
    drawCropRect();
});

/* 3. Dibujar rectángulo de recorte */
function drawCropRect() {
    const ctx = cropCanvas.getContext('2d');
    cropCanvas.width  = video.videoWidth;
    cropCanvas.height = video.videoHeight;
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

    const startX = Math.max(0, touchX - CROP_WIDTH / 2);
    const startY = Math.max(0, touchY - CROP_HEIGHT / 2);

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth   = 3;
    ctx.strokeRect(startX, startY, CROP_WIDTH, CROP_HEIGHT);
}

/* 4. Capturar foto completa y recortar */
captureBtn.addEventListener('click', async () => {
    if (touchX === null || touchY === null) {
        alert('Toca la pantalla sobre la patente antes de capturar.');
        return;
    }

    // Dibujar frame actual del video en fullCanvas
    const w = video.videoWidth;
    const h = video.videoHeight;
    fullCanvas.width  = w;
    fullCanvas.height = h;
    const fullCtx = fullCanvas.getContext('2d');
    fullCtx.drawImage(video, 0, 0, w, h);

    // Coordenadas del recorte en la foto completa
    const startX = Math.max(0, Math.round(touchX - CROP_WIDTH / 2));
    const startY = Math.max(0, Math.round(touchY - CROP_HEIGHT / 2));

    // Dibujar recorte en cropCanvas
    cropCanvas.width  = CROP_WIDTH;
    cropCanvas.height = CROP_HEIGHT;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(
        fullCanvas,
        startX, startY, CROP_WIDTH, CROP_HEIGHT, // origen
        0, 0, CROP_WIDTH, CROP_HEIGHT            // destino
    );

    // Convertir a Blob para pasar a Tesseract
    const blob = await new Promise(r => cropCanvas.toBlob(r, 'image/jpeg'));

    /* 5. OCR con Tesseract.js v6 */
    ocrText.textContent = 'Procesando...';

    const worker = Tesseract.createWorker({
        logger: m => console.log(m)   // opcional: ver progreso en consola
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Limitar al alfabeto y números típicos de patentes
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });

    const { data: { text } } = await worker.recognize(blob);
    await worker.terminate();

    // Limpiar salida
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
