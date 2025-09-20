
// Lista de patentes para comparar (puedes agregar más)
const PATENT_DATABASE = [
    'ABC123',
    'XYZ789',
    'DEF456',
    'GHI012',
    'JKL345',
    'MNO678',
    'PQR901',
    'STU234',
    'VWX567',
    'YZA890',
    'BCD123',
    'EFG456'
];

class PatentScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.capturedCanvas = document.getElementById('captured-image');
        this.selectionOverlay = document.getElementById('selection-overlay');
        this.startCameraBtn = document.getElementById('start-camera');
        this.captureBtn = document.getElementById('capture');
        this.toggleCameraBtn = document.getElementById('toggle-camera');
        this.ocrText = document.getElementById('ocr-text');
        this.matchStatus = document.getElementById('match-status');
        this.resultContainer = document.getElementById('result-container');
        this.loading = document.getElementById('loading');
        
        this.stream = null;
        this.facingMode = 'environment'; // Cámara trasera por defecto
        this.selectionBox = null;
        this.isSelecting = false;
        this.startPos = null;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.captureAndScan());
        this.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        
        // Event listeners para selección táctil
        this.video.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.video.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.video.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Event listeners para mouse (útil para testing)
        this.video.addEventListener('mousedown', (e) => this.handleMouseStart(e));
        this.video.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.video.addEventListener('mouseup', (e) => this.handleMouseEnd(e));
    }
    
    async startCamera() {
        try {
            // Solicitar permisos de cámara
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            this.video.srcObject = this.stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                this.startCameraBtn.disabled = true;
                this.captureBtn.disabled = false;
                this.toggleCameraBtn.disabled = false;
                this.startCameraBtn.textContent = 'Cámara Activa';
                this.showInstructions();
            });
            
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            alert('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }
    
    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        await this.startCamera();
    }
    
    showInstructions() {
        const instructions = document.querySelector('.instructions');
        instructions.style.display = 'block';
        
        setTimeout(() => {
            instructions.style.opacity = '0.7';
        }, 3000);
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.video.getBoundingClientRect();
        this.startSelection(touch.clientX - rect.left, touch.clientY - rect.top);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isSelecting) return;
        
        const touch = e.touches[0];
        const rect = this.video.getBoundingClientRect();
        this.updateSelection(touch.clientX - rect.left, touch.clientY - rect.top);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.endSelection();
    }
    
    handleMouseStart(e) {
        const rect = this.video.getBoundingClientRect();
        this.startSelection(e.clientX - rect.left, e.clientY - rect.top);
    }
    
    handleMouseMove(e) {
        if (!this.isSelecting) return;
        
        const rect = this.video.getBoundingClientRect();
        this.updateSelection(e.clientX - rect.left, e.clientY - rect.top);
    }
    
    handleMouseEnd(e) {
        this.endSelection();
    }
    
    startSelection(x, y) {
        this.isSelecting = true;
        this.startPos = { x, y };
        
        this.selectionOverlay.style.display = 'block';
        this.selectionBox = this.selectionOverlay.querySelector('.selection-box');
        
        this.selectionBox.style.left = `${x}px`;
        this.selectionBox.style.top = `${y}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
    }
    
    updateSelection(x, y) {
        if (!this.isSelecting || !this.selectionBox) return;
        
        const width = Math.abs(x - this.startPos.x);
        const height = Math.abs(y - this.startPos.y);
        const left = Math.min(x, this.startPos.x);
        const top = Math.min(y, this.startPos.y);
        
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }
    
    endSelection() {
        this.isSelecting = false;
        
        // Activar botón de captura si hay una selección válida
        if (this.selectionBox) {
            const width = parseInt(this.selectionBox.style.width);
            const height = parseInt(this.selectionBox.style.height);
            
            if (width > 50 && height > 20) {
                this.captureBtn.style.background = '#28a745';
                this.captureBtn.textContent = 'Escanear Área Seleccionada';
            }
        }
    }
    
    captureAndScan() {
        if (!this.selectionBox) {
            alert('Primero selecciona un área tocando y arrastrando en la imagen.');
            return;
        }
        
        this.showLoading(true);
        
        // Obtener dimensiones de la selección
        const videoRect = this.video.getBoundingClientRect();
        const selectionRect = {
            left: parseInt(this.selectionBox.style.left),
            top: parseInt(this.selectionBox.style.top),
            width: parseInt(this.selectionBox.style.width),
            height: parseInt(this.selectionBox.style.height)
        };
        
        // Capturar la imagen
        this.captureFrame(selectionRect)
            .then(imageData => this.performOCR(imageData))
            .then(result => this.processOCRResult(result.text, result.confidence))
            .catch(error => {
                console.error('Error en el procesamiento:', error);
                this.showError('Error al procesar la imagen.');
            })
            .finally(() => {
                this.showLoading(false);
            });
    }
    
    captureFrame(selectionRect) {
        return new Promise((resolve) => {
            // Configurar canvas con las dimensiones del video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            const ctx = this.canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Calcular proporciones para mapear la selección al video real
            const scaleX = this.video.videoWidth / this.video.offsetWidth;
            const scaleY = this.video.videoHeight / this.video.offsetHeight;
            
            const cropX = selectionRect.left * scaleX;
            const cropY = selectionRect.top * scaleY;
            const cropWidth = selectionRect.width * scaleX;
            const cropHeight = selectionRect.height * scaleY;
            
            // Extraer la región seleccionada
            const imageData = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
            
            // Mostrar la imagen capturada
            this.capturedCanvas.width = cropWidth;
            this.capturedCanvas.height = cropHeight;
            this.capturedCanvas.style.display = 'block';
            
            const capturedCtx = this.capturedCanvas.getContext('2d');
            capturedCtx.putImageData(imageData, 0, 0);
            
            // Convertir a blob para Tesseract
            this.capturedCanvas.toBlob(resolve, 'image/png');
        });
    }
    
    async performOCR(imageBlob) {
        try {
            // Configuración optimizada para Tesseract.js v6.0.1
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`Progreso OCR: ${Math.round(m.progress * 100)}%`);
                        // Actualizar indicador de progreso si existe
                        const progressText = document.querySelector('.loading p');
                        if (progressText) {
                            progressText.textContent = `Procesando imagen... ${Math.round(m.progress * 100)}%`;
                        }
                    }
                }
            });

            // Configurar parámetros específicos para reconocimiento de patentes
            await worker.setParameters({
                'tessedit_char_whitelist': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                'tessedit_pageseg_mode': Tesseract.PSM.SINGLE_BLOCK,
                'tessedit_ocr_engine_mode': Tesseract.OEM.LSTM_ONLY,
                'preserve_interword_spaces': '0'
            });

            // Realizar el reconocimiento
            const { data: { text, confidence } } = await worker.recognize(imageBlob);
            
            console.log(`Confianza del OCR: ${confidence}%`);
            
            // Terminar el worker para liberar memoria
            await worker.terminate();
            
            return { text, confidence };
            
        } catch (error) {
            console.error('Error en OCR:', error);
            throw new Error('Error al procesar el texto de la imagen');
        }
    }
    
    processOCRResult(rawText) {
        // Limpiar y procesar el texto del OCR
        let cleanedText = rawText
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .trim();
        
        console.log('Texto OCR original:', rawText);
        console.log('Texto OCR limpio:', cleanedText);
        
        // Mostrar el resultado
        this.ocrText.textContent = cleanedText || 'No se detectó texto';
        this.resultContainer.style.display = 'block';
        
        // Buscar coincidencias en la base de datos
        const match = this.findPatentMatch(cleanedText);
        this.displayMatchResult(match, cleanedText);
        
        // Limpiar selección
        this.clearSelection();
    }
    
    findPatentMatch(scannedText) {
        if (!scannedText) return null;
        
        // Búsqueda exacta
        let exactMatch = PATENT_DATABASE.find(patent => patent === scannedText);
        if (exactMatch) return { type: 'exact', patent: exactMatch };
        
        // Búsqueda por similitud (contiene o está contenido)
        let partialMatch = PATENT_DATABASE.find(patent => 
            patent.includes(scannedText) || scannedText.includes(patent)
        );
        if (partialMatch) return { type: 'partial', patent: partialMatch };
        
        // Búsqueda por distancia de edición simple
        for (let patent of PATENT_DATABASE) {
            if (this.calculateSimilarity(patent, scannedText) > 0.7) {
                return { type: 'similar', patent: patent };
            }
        }
        
        return null;
    }
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[j][i] = matrix[j - 1][i - 1];
                } else {
                    matrix[j][i] = Math.min(
                        matrix[j - 1][i - 1] + 1,
                        matrix[j][i - 1] + 1,
                        matrix[j - 1][i] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    displayMatchResult(match, scannedText) {
        const statusEl = this.matchStatus;
        
        if (match) {
            statusEl.className = 'match-status match-found';
            let message = `✅ PATENTE ENCONTRADA: ${match.patent}`;
            
            if (match.type === 'exact') {
                message += ' (Coincidencia exacta)';
            } else if (match.type === 'partial') {
                message += ' (Coincidencia parcial)';
            } else if (match.type === 'similar') {
                message += ' (Coincidencia similar)';
            }
            
            statusEl.textContent = message;
        } else {
            statusEl.className = 'match-status match-not-found';
            statusEl.textContent = '❌ PATENTE NO ENCONTRADA EN LA BASE DE DATOS';
        }
    }
    
    clearSelection() {
        this.selectionOverlay.style.display = 'none';
        this.selectionBox = null;
        this.captureBtn.style.background = '#333';
        this.captureBtn.textContent = 'Capturar y Escanear';
    }
    
    showLoading(show) {
        this.loading.style.display = show ? 'flex' : 'none';
        this.captureBtn.disabled = show;
        
        if (show) {
            this.matchStatus.className = 'match-status match-processing';
            this.matchStatus.textContent = '⏳ Procesando imagen...';
            this.resultContainer.style.display = 'block';
        }
    }
    
    showError(message) {
        this.matchStatus.className = 'match-status match-not-found';
        this.matchStatus.textContent = `❌ ${message}`;
        this.resultContainer.style.display = 'block';
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PatentScanner();
});