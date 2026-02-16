@echo off
set "VENV_PYTHON=C:\Users\User\Documents\Projects\Movie Expert System\.venv\bin\python"
set "VENV_STREAMLIT=C:\Users\User\Documents\Projects\Movie Expert System\.venv\bin\streamlit"

echo [1/2] Installing dependencies...
"%VENV_PYTHON%" -m pip install -r requirements.txt

echo [2/2] Starting Streamlit...
"%VENV_STREAMLIT%" run app/streamlit_app.py --server.port 8501 --server.address 0.0.0.0 --server.headless true
