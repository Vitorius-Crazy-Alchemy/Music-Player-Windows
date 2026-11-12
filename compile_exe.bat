@echo off
setlocal
title Compile Vitorius Music Player Pro EXE

cd /d "%~dp0"
echo [Vitorius Music Player Pro] Compiling Native Windows Executable...

set "CSC=%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"

if not exist "%CSC%" (
    echo [ERROR] Microsoft .NET C# Compiler (csc.exe) not found in Windows directory.
    echo You can still run the player directly via VitoriusMusicPlayerPro.bat or VitoriusMusicPlayerPro.vbs!
    pause
    exit /b 1
)

echo Using Compiler: %CSC%
"%CSC%" /target:winexe /optimize+ /out:VitoriusMusicPlayerPro.exe src\Launcher.cs

if exist "VitoriusMusicPlayerPro.exe" (
    echo.
    echo [SUCCESS] VitoriusMusicPlayerPro.exe compiled successfully!
    echo You can now double-click VitoriusMusicPlayerPro.exe to run.
) else (
    echo.
    echo [ERROR] Compilation failed.
)

pause
