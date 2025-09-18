import React, { useState } from 'react';
import { Container, Typography, Box, AppBar, Toolbar } from '@mui/material';
import CameraScanner from './components/CameraScanner';
import ResultDisplay from './components/ResultDisplay';
import { useLicensePlates } from './hooks/useLicensePlates';

function App() {
  const [scanResult, setScanResult] = useState(null);
  const [scannedText, setScannedText] = useState('');
  const authorizedPlates = useLicensePlates();

  const normalizeText = (text) => {
    return text.replace(/[^A-Z0-9]/g, '').toUpperCase();
  };

  const handleScanComplete = (text, error = false) => {
    if (error) {
      setScannedText('Error en el procesamiento');
      setScanResult('UNAUTHORIZED');
      return;
    }

    const normalizedText = normalizeText(text);
    setScannedText(normalizedText);

    if (authorizedPlates.has(normalizedText)) {
      setScanResult('AUTHORIZED');
    } else {
      setScanResult('UNAUTHORIZED');
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Verificador de Patentes
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <CameraScanner onScanComplete={handleScanComplete} />
        <ResultDisplay result={scanResult} scannedText={scannedText} />
      </Container>
    </Box>
  );
}

export default App;