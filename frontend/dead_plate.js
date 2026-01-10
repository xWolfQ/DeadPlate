import React, { useState } from 'react';
import './dead_plate.css';

function DeadPlate() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [computerResult, setComputerResult] = useState('Waiting for backend processing...');
  const [detectionResult, setDetectionResult] = useState('Waiting for detection results...');

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
    formData.append('image', file);

    setComputerResult('Wysyłanie na backend...');
    setDetectionResult('Czekanie na wyniki...');

    try {
      const response = await fetch('/api/plate', {
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
          <div className="showcase-content">
            {filePreview ? (
              <div>
                <img
                  src={filePreview}
                  className="image-preview"
                  alt="Uploaded file"
                />
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
            <pre>{computerResult}</pre>
          </div>
        </div>
      </div>

      <div className="result-section">
        <h2>Wykryta rejestracja</h2>
        <input
          type="text"
          value={detectionResult}
          readOnly
          className="result-input"
        />
      </div>
    </div>
  );
}

export default DeadPlate;