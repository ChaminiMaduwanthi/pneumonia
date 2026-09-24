@echo off
REM Start the LungVision AI inference service (DenseNet121 default).
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [setup] Creating virtual environment...
  python -m venv .venv
  call .venv\Scripts\python.exe -m pip install --upgrade pip
  call .venv\Scripts\python.exe -m pip install -r requirements.txt
)
echo [run] Starting inference service on http://127.0.0.1:8001 ...
call .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
