import { createWorker } from 'tesseract.js';

// Helper function to check if OpenCV is loaded
const isOpenCvReady = () => typeof cv !== 'undefined';

const processImage = async (imageSrc, setProgress) => {
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
      setProgress({ status: 'Preprocessing', progress: 25 });

      // 2. Binarization (Adaptive Threshold)
      let binary = new cv.Mat();
      cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
      setProgress({ status: 'Preprocessing', progress: 50 });

      // Create a canvas to pass to Tesseract
      const canvas = document.createElement('canvas');
      cv.imshow(canvas, binary);
      
      img.delete();
      gray.delete();
      binary.delete();

      setProgress({ status: 'Recognizing text', progress: 75 });

      const worker = await createWorker('eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                setProgress({ status: 'Recognizing', progress: 75 + (m.progress * 25) });
            }
        }
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
