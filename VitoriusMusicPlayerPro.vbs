' Vitorius Music Player Pro - Silent Windows Launcher
Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run """" & strPath & "\VitoriusMusicPlayerPro.bat""", 0, False
Set WshShell = Nothing
