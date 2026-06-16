@echo off
cd /d "%~dp0"
start "" http://localhost:4173/index.html
python -m http.server 4173
