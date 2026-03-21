@echo off
echo ========================================
echo   Karaoke App - Setup
echo ========================================
echo.

echo [1/4] Creando entorno virtual de Python...
cd /d "%~dp0.."
python -m venv venv
call venv\Scripts\activate.bat

echo [2/4] Instalando yt-dlp...
pip install yt-dlp

echo [3/4] Instalando dependencias de Python...
pip install -r backend\requirements.txt

echo [4/4] Instalando dependencias de Node.js...
cd frontend
call npm install
cd ..

echo.
echo ========================================
echo   Setup completado!
echo   Ejecuta scripts\run.bat para iniciar
echo ========================================
pause
