@echo off
setlocal
title Vitorius Music Player Pro

:: Set working directory to script location
cd /d "%~dp0"

:: Mark portable mode flag
if not exist "data" mkdir "data"
echo portable > "data\portable.flag"

set "APP_URL=file:///%~dp0app/index.html"
set "APP_URL=%APP_URL:\=/%"

:: Check for native compiled EXE first
if exist "VitoriusMusicPlayerPro.exe" (
    start "" "VitoriusMusicPlayerPro.exe"
    exit /b
)

:: Locate Microsoft Edge or Google Chrome for Standalone App Window Mode
set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_EXE%" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_EXE%" set "EDGE_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

:: Launch in dedicated app mode with custom window dimensions and isolated profile
if exist "%EDGE_EXE%" (
    start "" "%EDGE_EXE%" --app="%APP_URL%" --user-data-dir="%~dp0data\edge-profile" --window-size=1240,820 --enable-features=OverlayScrollbar
    exit /b
)

if exist "%CHROME_EXE%" (
    start "" "%CHROME_EXE%" --app="%APP_URL%" --user-data-dir="%~dp0data\chrome-profile" --window-size=1240,820
    exit /b
)

:: Fallback: Open in default browser
start "" "%APP_URL%"
exit /b
