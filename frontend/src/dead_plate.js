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
  const [computerResult, setComputerResult] = useState(
    'Rejestracja: -\nPewność: -'
  );

  useEffect(() => {
    return () => {
      if (croppedPreview) URL.revokeObjectURL(croppedPreview);
    };
  }, [croppedPreview]);

  const uploadFile = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

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
    reader.onload = (event) => setFilePreview(event.target.result);
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

    setComputerResult('Przetwarzanie...');

    try {
      const response = await fetch('http://localhost:8080/api/plates/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('Odpowiedź z backendu:', data);

      const plate = data?.plate ?? '-';
      const confidence =
        typeof data?.confidence === 'number' ? `${data.confidence}%` : '-';

      const debug =
        Array.isArray(data?.confidence_debug)
          ? data.confidence_debug.join('\n')
          : '-';

      setComputerResult(
        `Rejestracja: ${plate}\n` +
        `Pewność: ${confidence}\n\n`
      );
    } catch (error) {
      console.error('Błąd:', error);
      setComputerResult(`Błąd: ${error.message}`);
    }
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const handleClick = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);

    if (!isSelecting) {
      selectionStartRef.current = { x, y };
      setCropRect({ x, y, width: 0, height: 0 });
      cropRectRef.current = { x, y, width: 0, height: 0 };
      setIsSelecting(true);
    } else {
      const start = selectionStartRef.current;
      if (!start) return;

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

      if (newRect.width > 0.01 && newRect.height > 0.01) {
        generateCropped(newRect);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !imageRef.current || !selectionStartRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const currentX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const currentY = clamp((e.clientY - rect.top) / rect.height, 0, 1);
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
    if (isSelecting) {
      setIsSelecting(false);
      selectionStartRef.current = null;
    }
  };

  const generateCropped = (rect) => {
    if (!filePreview || !imageRef.current) return;

    const imgEl = imageRef.current;
    const { naturalWidth, naturalHeight } = imgEl;

    const canvas = document.createElement('canvas');
    canvas.width = rect.width * naturalWidth;
    canvas.height = rect.height * naturalHeight;

    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      ctx.drawImage(
        img,
        rect.x * naturalWidth,
        rect.y * naturalHeight,
        rect.width * naturalWidth,
        rect.height * naturalHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob((blob) => {
        if (!blob) return;
        setCroppedBlob(blob);
        setCroppedPreview(URL.createObjectURL(blob));
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
          <button className="btn-upload" onClick={sendToBackend} disabled={!file}>
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
                    alt="Uploaded"
                    ref={imageRef}
                    draggable={false}
                  />
                  {cropRect && imageRef.current && (
                    <div
                      className="crop-rect"
                      style={{
                        left: cropRect.x * imageRef.current.clientWidth,
                        top: cropRect.y * imageRef.current.clientHeight,
                        width: cropRect.width * imageRef.current.clientWidth,
                        height: cropRect.height * imageRef.current.clientHeight
                      }}
                    />
                  )}
                </div>
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
              <img src={croppedPreview} className="image-preview" alt="Cropped" />
            ) : (
              <p className="no-file">Zaznacz obszar na zdjęciu.</p>
            )}
          </div>
        </div>
      </div>

      <div className="result-section">
        <h2>Wynik</h2>
        <textarea
          value={computerResult}
          readOnly
          className="result-input"
          rows={6}
        />
      </div>
    </div>
  );
}

export default DeadPlate;
