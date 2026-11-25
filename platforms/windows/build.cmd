@echo off
setlocal
pushd "%~dp0"
set "CGO_ENABLED=0"
set "GOOS=windows"
set "dest=..\..\build\windows"
if not exist "%dest%\runtime" mkdir "%dest%\runtime"
for %%A in (amd64 arm64 386) do call :compile %%A || exit /b 1
xcopy /E /I /Y "..\..\dist" "%dest%\site" >nul || exit /b 1
copy /Y "%~dp0*.cmd" "%dest%\" >nul
del "%dest%\build.cmd"
copy /Y Go-LICENSE.txt "%dest%\" >nul
popd
exit /b 0
:compile
set "GOARCH=%1"
set "name=%1"
if "%1"=="amd64" set "name=x64"
if "%1"=="386" set "name=x86"
go build -trimpath -buildvcs=false -o "%dest%\runtime\focus-%name%.exe" .
exit /b %errorlevel%
