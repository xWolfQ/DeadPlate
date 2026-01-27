import React, { useEffect, useRef, useState } from 'react';
import './dead_plate.css';

function DeadPlate() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [cropRect, setCropRect] = useState(null);
  const cropRectRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const imageRef = useRef(null);
  const selectionStartRef = useRef(null);
  const [computerResult, setComputerResult] = useState('Waiting for backend processing...');
  const [detectionResult, setDetectionResult] = useState('Waiting for detection results...');

  useEffect(() => {
    return () => {
      if (croppedPreview) {
        URL.revokeObjectURL(croppedPreview);
      }
    };
  }, [croppedPreview]);

  const uploadFile = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      alert('Wybierz plik przed przesłaniem.');
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      alert('Proszę przesłać plik graficzny.');
      return;
    }

    setFile(selectedFile);
    setCroppedPreview(null);
    setCropRect(null);
    setCroppedBlob(null);
    cropRectRef.current = null;
    selectionStartRef.current = null;
    setIsSelecting(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFilePreview(event.target.result);
      console.log('File preview set:', event.target.result.substring(0, 50));
    };
    reader.readAsDataURL(selectedFile);
  };

  const sendToBackend = async () => {
    if (!file) {
      alert('Brak pliku do wysłania.');
      return;
    }

    const formData = new FormData();
    const payload = croppedBlob || file;
    formData.append('image', payload, payload.name || 'cropped.png');

    setComputerResult('Wysyłanie na backend...');
    setDetectionResult('Czekanie na wyniki...');

    try {
      const response = await fetch('/http://localhost:8080/api/plates/upload/plate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Błąd wysyłania pliku');

      const data = await response.json();

      console.log('Odpowiedź z backendu:', data);
      setComputerResult(`Przetwarzanie zakończone\n${JSON.stringify(data, null, 2)}`);
      setDetectionResult(data.plate || 'Nie wykryto rejestracji');
    } catch (error) {
      console.error('Błąd:', error);
      setComputerResult(`Błąd: ${error.message}`);
      alert('Nie udało się wysłać pliku. Sprawdź konsolę.');
    }
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const handleClick = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    if (!isSelecting) {
      selectionStartRef.current = { x, y };
      setCropRect({ x, y, width: 0, height: 0 });
      cropRectRef.current = { x, y, width: 0, height: 0 };
      setIsSelecting(true);
    } else {
      const start = selectionStartRef.current;
      if (!start) {
        setIsSelecting(false);
        return;
      }
      const newRect = {
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y)
      };
      setCropRect(newRect);
      cropRectRef.current = newRect;
      setIsSelecting(false);
      selectionStartRef.current = null;
      if (newRect.width > 5 && newRect.height > 5) {
        generateCropped(newRect);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !imageRef.current || !selectionStartRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = clamp(e.clientX - rect.left, 0, rect.width);
    const currentY = clamp(e.clientY - rect.top, 0, rect.height);
    const { x: startX, y: startY } = selectionStartRef.current;
    const newRect = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY)
    };
    cropRectRef.current = newRect;
    setCropRect(newRect);
  };

  const handleMouseLeave = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    selectionStartRef.current = null;
  };

  const generateCropped = (rect) => {
    if (!filePreview || !imageRef.current) return;
    const imgEl = imageRef.current;
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgEl;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;
    const cropX = rect.x * scaleX;
    const cropY = rect.y * scaleY;
    const cropWidth = rect.width * scaleX;
    const cropHeight = rect.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCroppedPreview(url);
        setCroppedBlob(blob);
      }, 'image/png');
    };
    img.src = filePreview;
  };

  const fileSizeDisplay = file
    ? file.size / 1024 < 1024
      ? `${(file.size / 1024).toFixed(2)} KB`
      : `${(file.size / 1024 / 1024).toFixed(2)} MB`
    : null;

  return (
    <div className="container">
      <h1>DeadPlate</h1>

      <div className="upload-section">
        <div className="file-input-wrapper">
          <input type="file" accept="image/*" onChange={uploadFile} />
          <button
            className="btn-upload"
            onClick={sendToBackend}
            disabled={!file}
          >
            Przetwórz
          </button>
        </div>
      </div>

      <div className="showcase-wrapper">
        <div className="showcase-section">
          <h2>1. Przesłane zdjęcie</h2>
          <div
            className="showcase-content crop-area"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {filePreview ? (
              <div>
                <div className="image-wrapper">
                  <img
                    src={filePreview}
                    className="image-preview"
                    alt="Uploaded file"
                    ref={imageRef}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={() => {
                      const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;
                      console.log('Image loaded with sizes:', {
                        naturalWidth,
                        naturalHeight,
                        clientWidth,
                        clientHeight
                      });
                    }}
                  />
                  {cropRect && (
                    <div
                      className="crop-rect"
                      style={{
                        left: `${cropRect.x}px`,
                        top: `${cropRect.y}px`,
                        width: `${cropRect.width}px`,
                        height: `${cropRect.height}px`
                      }}
                    />
                  )}
                </div>
                <p className="hint">Kliknij i przeciągnij, aby zaznaczyć obszar do przycięcia.</p>
                <div className="file-info">
                  <strong>Nazwa pliku:</strong> {file.name}
                  <br />
                  <strong>Rozmiar pliku:</strong> {fileSizeDisplay}
                  <br />
                  <strong>Typ pliku:</strong> {file.type}
                </div>
              </div>
            ) : (
              <p className="no-file">Nie przesłano pliku</p>
            )}
          </div>
        </div>

        <div className="showcase-section">
          <h2>2. Kadrowanie</h2>
          <div className="showcase-content">
            {croppedPreview ? (
              <img
                src={croppedPreview}
                className="image-preview"
                alt="Cropped preview"
              />
            ) : (
              <p className="no-file">Zaznacz obszar na zdjęciu, aby zobaczyć przycięcie.</p>
            )}
          </div>
        </div>
      </div>

      <div className="result-section">
        <h2>Wykryta rejestracja</h2>
        <input
          type="text"
          value={computerResult}
          readOnly
          className="result-input"
        />
      </div>
    </div>
  );
}

export default DeadPlate;