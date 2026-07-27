@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0taa.ps1" %*
endlocal
