@echo off
setlocal
title Uninstall Vitorius Music Player Pro

echo =====================================================================
echo          VITORIUS MUSIC PLAYER PRO - UNINSTALLER
echo =====================================================================
echo.
echo Are you sure you want to remove Vitorius Music Player Pro?
set /p confirm="Type Y to continue, or N to cancel: "
if /i not "%confirm%"=="Y" exit /b

echo [*] Removing shortcuts...
del /f /q "%USERPROFILE%\Desktop\Vitorius Music Player Pro.lnk" 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Vitorius Music Player Pro.lnk" 2>nul

set "TARGET_DIR=%LOCALAPPDATA%\Programs\VitoriusMusicPlayerPro"
echo [*] Cleaning directory: %TARGET_DIR%

:: Spawn a temporary cleanup script to delete the folder after batch exit
start /b "" cmd /c "timeout /t 1 /nobreak >nul & rmdir /s /q \"%TARGET_DIR%\""

echo [SUCCESS] Vitorius Music Player Pro has been uninstalled.
pause
exit
