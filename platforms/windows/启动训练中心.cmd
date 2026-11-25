@echo off
setlocal
set "focusArch=%PROCESSOR_ARCHITECTURE%"
if defined PROCESSOR_ARCHITEW6432 set "focusArch=%PROCESSOR_ARCHITEW6432%"
set "focusExe=focus-x86.exe"
if /I "%focusArch%"=="AMD64" set "focusExe=focus-x64.exe"
if /I "%focusArch%"=="ARM64" set "focusExe=focus-arm64.exe"
"%~dp0runtime\%focusExe%"
if errorlevel 1 pause
endlocal
