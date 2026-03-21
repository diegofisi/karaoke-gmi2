@echo off
echo ========================================
echo   Karaoke App - Starting...
echo ========================================
echo.

cd /d "%~dp0.."

echo Iniciando Backend (FastAPI)...
start "Karaoke Backend" cmd /k "call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

echo Iniciando Frontend (Vite)...
start "Karaoke Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Abre http://localhost:5173 en tu navegador
pause
