@echo off
echo ========================================
echo   Karaoke App - Setup
echo ========================================
echo.

echo [1/5] Creando entorno virtual de Python...
cd /d "%~dp0.."
python -m venv venv
if errorlevel 1 (
    echo ERROR: No se pudo crear el entorno virtual. Asegurate de tener Python instalado.
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

echo [2/5] Instalando PyTorch (puede tardar varios minutos)...
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
if errorlevel 1 (
    echo ADVERTENCIA: Fallo la instalacion de PyTorch con CUDA. Intentando version CPU...
    pip install torch torchaudio
)

echo [3/5] Instalando dependencias de Python...
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias de Python.
    echo Revisa los errores arriba.
    pause
    exit /b 1
)

echo [4/5] Instalando yt-dlp...
pip install yt-dlp
if errorlevel 1 (
    echo ERROR: Fallo la instalacion de yt-dlp.
    pause
    exit /b 1
)

echo [5/5] Instalando dependencias de Node.js...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias de Node.js.
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   Setup completado!
echo   Ejecuta scripts\run.bat para iniciar
echo ========================================
pause
