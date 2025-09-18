import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { processImage } from '../services/ocrService';

const CameraScanner = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [progress, setProgress] = useState({ status: 'Idle', progress: 0 });
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const grayCanvasRef = useRef(null);
  const blurredCanvasRef = useRef(null);
  const binaryCanvasRef = useRef(null);

  const startScan = async () => {
    setIsScanning(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const handleCaptureClick = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    stopScan();
    setCapturedImage(canvas);
    setIsProcessing(true);
    setProgress({ status: 'Initializing', progress: 0 });
  };

  useEffect(() => {
    const runProcessing = async () => {
      if (isProcessing && capturedImage) {
        try {
          const debugCanvases = {
            gray: grayCanvasRef.current,
            blurred: blurredCanvasRef.current,
            binary: binaryCanvasRef.current,
          };
          const text = await processImage(capturedImage, setProgress, debugCanvases);
          onScanComplete(text);
        } catch (error) {
          console.error('Scan failed:', error);
          onScanComplete('', true); // Signal an error to parent
        } finally {
          setIsProcessing(false);
        }
      }
    };
    runProcessing();
  }, [isProcessing, capturedImage]);

  useEffect(() => {
    return () => stopScan(); // Cleanup on unmount
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', maxWidth: '500px', position: 'relative', borderRadius: 2, overflow: 'hidden', mb: 2, border: '1px solid #ddd' }}>
        {isScanning ? (
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
        ) : (
          <Box sx={{ height: 250, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CameraAltIcon color="disabled" sx={{ fontSize: 60 }} />
          </Box>
        )}
        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      </Box>

      {isProcessing ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
          <CircularProgress variant="determinate" value={progress.progress} />
          <Typography>{`${progress.status} ${progress.progress}%`}</Typography>
        </Box>
      ) : (
        <Button 
          variant="contained" 
          size="large" 
          onClick={isScanning ? handleCaptureClick : startScan}
          startIcon={<CameraAltIcon />}
        >
          {isScanning ? 'Capturar y Procesar' : 'Iniciar Escáner'}
        </Button>
      )}

      {/* --- DEBUG VIEW --- */}
      {(isProcessing || capturedImage) && (
        <Box sx={{ mt: 4, p: 2, border: '1px dashed grey', borderRadius: 2, width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>Vista de Depuración</Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption">1. Escala de Grises</Typography>
              <canvas ref={grayCanvasRef} style={{ width: '100%', maxWidth: 300, border: '1px solid black' }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption">2. Desenfoque</Typography>
              <canvas ref={blurredCanvasRef} style={{ width: '100%', maxWidth: 300, border: '1px solid black' }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption">3. Binario (Final)</Typography>
              <canvas ref={binaryCanvasRef} style={{ width: '100%', maxWidth: 300, border: '1px solid black' }} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CameraScanner;
