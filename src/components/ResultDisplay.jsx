import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ResultDisplay = ({ result, scannedText }) => {
  if (result === null) {
    return (
      <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ mt: 3 }}>
        <Typography variant="h6">Esperando escaneo</Typography>
        Apunte a una patente y presione "Escanear".
      </Alert>
    );
  }

  const isAuthorized = result === 'AUTHORIZED';

  return (
    <Alert 
      severity={isAuthorized ? "success" : "error"} 
      icon={isAuthorized ? <CheckCircleOutlineIcon fontSize="inherit" /> : <HighlightOffIcon fontSize="inherit" />} 
      sx={{ mt: 3, textAlign: 'center' }}
    >
      <Typography variant="h5" component="div">{isAuthorized ? 'AUTORIZADA' : 'NO AUTORIZADA'}</Typography>
      {scannedText && <Typography variant="body1" sx={{ mt: 1 }}>Patente: <strong>{scannedText}</strong></Typography>}
    </Alert>
  );
};

export default ResultDisplay;
