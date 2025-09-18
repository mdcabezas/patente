import { useState, useEffect } from 'react';

export const useLicensePlates = () => {
  const [platesSet, setPlatesSet] = useState(new Set());

  useEffect(() => {
    fetch('patentes.json')
      .then(response => response.json())
      .then(data => {
        setPlatesSet(new Set(data));
      })
      .catch(error => console.error('Error loading license plates:', error));
  }, []);

  return platesSet;
};
