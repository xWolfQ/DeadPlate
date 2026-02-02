# DeadPlate 🚗📸  
Aplikacja webowa do rozpoznawania tablic rejestracyjnych (OCR) z wykorzystaniem:
- **React** (frontend)
- **Spring Boot (Java)** (backend)
- **Python + OpenCV + Tesseract OCR**
- **Docker & Docker Compose**

Projekt uruchamiany jest w całości w kontenerach Docker.

---

## 📦 Wymagania

Zanim zaczniesz, upewnij się, że masz zainstalowane:

- **Docker Desktop**
  - Windows / macOS: https://www.docker.com/products/docker-desktop
  - Linux: Docker + Docker Compose
- **Git**

> ⚠️ Na Windowsie Docker Desktop musi być **uruchomiony** (zielona ikonka).

---

## 🚀 Uruchomienie projektu (najprostsza droga)

### 1️⃣ Sklonuj repozytorium

```bash
git clone https://github.com/xWolfQ/DeadPlate.git
cd DeadPlate
```

### 2️⃣ Zbuduj kontenery
```bash
docker compose build
```

(Przy pierwszym uruchomieniu może to potrwać kilka minut)

### 3️⃣ Uruchom aplikację
```bash
docker compose up
```