# ===== ETAP 1: build Spring Boot =====
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline

COPY src src
RUN ./mvnw clean package -DskipTests


# ===== ETAP 2: runtime (Java + Python + OCR) =====
FROM eclipse-temurin:17-jre

WORKDIR /app

# --- systemowe pakiety ---
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# --- virtualenv ---
RUN python3 -m venv /opt/venv

# --- aktywacja venv ---
ENV PATH="/opt/venv/bin:$PATH"

# --- python dependencies ---
RUN pip install --no-cache-dir \
    opencv-python-headless \
    pytesseract \
    numpy

# --- backend ---
COPY --from=build /app/target/*.jar app.jar
COPY opt /app/opt

ENV TESSERACT_CMD=/usr/bin/tesseract

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
