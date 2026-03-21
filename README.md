# Karaoke App

Aplicacion de karaoke que toma videos de YouTube, separa las voces del instrumental con IA (Demucs), genera letras sincronizadas con Whisper, y puntua tu canto en tiempo real (entonacion + letra).

## Requisitos

- **Python 3.10+** (probado con 3.14)
- **Node.js 18+**
- **FFmpeg** instalado y en PATH
- **Git**

## Setup

### 1. Backend (FastAPI + Python)

```bash
# Desde la raiz del proyecto
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt
pip install soundfile
```

> La primera vez que proceses una cancion, se descargaran los modelos de Whisper (~1.5GB) y Demucs (~300MB).

### 2. Frontend (React + Vite + TypeScript)

```bash
cd frontend
npm install
```

## Correr la app

### Opcion A: Script (Windows)

```bash
scripts\run.bat
```

Esto abre dos terminales: una para el backend y otra para el frontend.

### Opcion B: Manual (dos terminales)

**Terminal 1 - Backend:**
```bash
# Desde la raiz del proyecto
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Abrir en el navegador

```
http://localhost:5173
```

## Uso

1. Pega un link de YouTube (max 15 min)
2. Espera el procesamiento (descarga → separacion vocal → transcripcion → analisis de pitch)
3. Elige modo **Libre** (practica con controles de seek) o **Puntuacion** (scoring)
4. Canta! La app detecta tu pitch y reconoce lo que dices en tiempo real

## Stack

| Componente | Tecnologia |
|---|---|
| Backend | FastAPI, Python |
| Frontend | React, TypeScript, Vite |
| Separacion vocal | Demucs (htdemucs) |
| Transcripcion | OpenAI Whisper (medium) |
| Deteccion de pitch (ref) | librosa pyin |
| Deteccion de pitch (user) | YIN algorithm (JS nativo) |
| Reconocimiento de voz | Web Speech API |
| Romaji | pykakasi |
| Multi-cantante | sklearn clustering + MFCC |
