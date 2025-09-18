import { createWorker } from 'tesseract.js';

// Helper function to check if OpenCV is loaded
const isOpenCvReady = () => typeof cv !== 'undefined';

const processImage = async (imageSrc, setProgress, debugCanvases) => {
  return new Promise(async (resolve, reject) => {
    if (!isOpenCvReady()) {
      console.error("OpenCV.js is not ready.");
      return reject("OpenCV.js is not ready.");
    }

    try {
      let img = cv.imread(imageSrc);
      
      // 1. Grayscale
      let gray = new cv.Mat();
      cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.imshow(debugCanvases.gray, gray);
      setProgress({ status: 'Preprocessing', progress: 20 });

      // 2. Noise Reduction (Gaussian Blur)
      let blurred = new cv.Mat();
      let ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);
      cv.imshow(debugCanvases.blurred, blurred);
      setProgress({ status: 'Preprocessing', progress: 40 });

      // 3. Binarization (Otsu's Threshold)
      let binary = new cv.Mat();
      cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.imshow(debugCanvases.binary, binary);
      setProgress({ status: 'Preprocessing', progress: 60 });

      // Create a canvas to pass to Tesseract (this one is not for display)
      const tesseractCanvas = document.createElement('canvas');
      cv.imshow(tesseractCanvas, binary);
      
      img.delete();
      gray.delete();
      blurred.delete();
      binary.delete();

      setProgress({ status: 'Recognizing text', progress: 75 });

      const worker = await createWorker('eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                setProgress({ status: 'Recognizing', progress: 75 + (m.progress * 25) });
            }
        }
      });
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: 13, // PSM_RAW_LINE
      });
      
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      resolve(text.trim());

    } catch (error) {
      console.error('Error during OCR process:', error);
      reject(error);
    }
  });
};

export { processImage };
