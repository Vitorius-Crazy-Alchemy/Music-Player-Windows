@echo off
setlocal EnableDelayedExpansion
title Install Vitorius Music Player Pro

echo =====================================================================
echo           VITORIUS MUSIC PLAYER PRO - WINDOWS INSTALLER
echo =====================================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\Programs\VitoriusMusicPlayerPro"
echo [*] Installing to: %TARGET_DIR%

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [*] Copying application files...
xcopy /E /I /Y "app" "%TARGET_DIR%\app" >nul
if exist "src" xcopy /E /I /Y "src" "%TARGET_DIR%\src" >nul
copy /Y "VitoriusMusicPlayerPro.bat" "%TARGET_DIR%\" >nul
copy /Y "VitoriusMusicPlayerPro.vbs" "%TARGET_DIR%\" >nul
if exist "VitoriusMusicPlayerPro.exe" copy /Y "VitoriusMusicPlayerPro.exe" "%TARGET_DIR%\" >nul
copy /Y "uninstall.bat" "%TARGET_DIR%\" >nul
copy /Y "README.md" "%TARGET_DIR%\" >nul

echo [*] Creating Desktop and Start Menu Shortcuts...

set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"

:: Use PowerShell to create .lnk shortcuts cleanly
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_DIR%\Vitorius Music Player Pro.lnk'); $s.TargetPath = '%TARGET_DIR%\VitoriusMusicPlayerPro.vbs'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Description = 'Vitorius Music Player Pro'; $s.Save()"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\Vitorius Music Player Pro.lnk'); $s.TargetPath = '%TARGET_DIR%\VitoriusMusicPlayerPro.vbs'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Description = 'Vitorius Music Player Pro'; $s.Save()"

echo.
echo =====================================================================
echo   [SUCCESS] Installation complete!
echo   - Desktop Shortcut created
echo   - Start Menu entry added
echo   - You can launch Vitorius Music Player Pro now!
echo =====================================================================
echo.
pause
start "" "%TARGET_DIR%\VitoriusMusicPlayerPro.vbs"
