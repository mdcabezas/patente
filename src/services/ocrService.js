import { createWorker } from 'tesseract.js';

const isOpenCvReady = () => typeof cv !== 'undefined';

const processImage = async (imageSrc, setProgress, debugCanvases) => {
  if (!isOpenCvReady()) {
    throw new Error("OpenCV.js is not ready.");
  }

  let img = cv.imread(imageSrc);
  let gray = new cv.Mat();
  let blurred = new cv.Mat();
  let binary = new cv.Mat();
  const tesseractCanvas = document.createElement('canvas');

  try {
    // 1. Grayscale
    cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow(debugCanvases.gray, gray);
    setProgress({ status: 'Preprocessing', progress: 20 });

    // 2. Noise Reduction (Gaussian Blur)
    let ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);
    cv.imshow(debugCanvases.blurred, blurred);
    setProgress({ status: 'Preprocessing', progress: 40 });

    // 3. Binarization (Otsu's Threshold)
    cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.imshow(debugCanvases.binary, binary);
    setProgress({ status: 'Preprocessing', progress: 60 });

    // Draw final image to the canvas Tesseract will use
    cv.imshow(tesseractCanvas, binary);

    // --- TESSERACT PROCESSING ---
    setProgress({ status: 'Initializing OCR', progress: 75 });
    const worker = await createWorker({
      logger: m => {
        // console.log(m); // Uncomment for deep debugging
        let status = m.status.charAt(0).toUpperCase() + m.status.slice(1);
        let progress = m.progress * 100;

        if (m.status === 'recognizing text') {
          status = 'Recognizing';
          // The recognition progress is already 0-1, scale it to the 75-100 range
          setProgress({ status: status, progress: 75 + (m.progress * 25) });
        } else if (m.status.startsWith('loading') || m.status.startsWith('initializing')) {
          // The loading/initializing progress is 0-1, scale it to the 0-75 range
          setProgress({ status: status, progress: m.progress * 75 });
        } else {
          setProgress({ status: status, progress: 75 });
        }
      }
    });
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: 8, // PSM_SINGLE_WORD
    });

    const { data: { text } } = await worker.recognize(tesseractCanvas);
    await worker.terminate();

    return text.trim();

  } finally {
    // Cleanup OpenCV Mats
    img.delete();
    gray.delete();
    blurred.delete();
    binary.delete();
  }
};

export { processImage };