; Inno Setup Script for Vitorius Music Player Pro
; Generates VitoriusMusicPlayerPro_Setup.exe

#define MyAppName "Vitorius Music Player Pro"
#define MyAppVersion "4.3"
#define MyAppPublisher "Crazy Alchemy"
#define MyAppExeName "VitoriusMusicPlayerPro.exe"
#define MyAppBatName "VitoriusMusicPlayerPro.bat"

[Setup]
AppId={{C8E29A10-6B3D-4A42-9988-8123456789AB}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\dist
OutputBaseFilename=VitoriusMusicPlayerPro_v{#MyAppVersion}_Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "fileassoc"; Description: "Associate with standard audio files (.mp3, .flac, .wav, .ogg, .m4a)"; GroupDescription: "File Associations:"

[Files]
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\{#MyAppBatName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\VitoriusMusicPlayerPro.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppBatName}"; IconFilename: "{app}\app\assets\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppBatName}"; IconFilename: "{app}\app\assets\app_icon.ico"; Tasks: desktopicon

[Registry]
; File associations if selected
Root: HKA; Subkey: "Software\Classes\.mp3\OpenWithProgids"; ValueType: string; ValueName: "VitoriusAudioFile"; ValueData: ""; Flags: uninsdeletevalue; Tasks: fileassoc
Root: HKA; Subkey: "Software\Classes\.flac\OpenWithProgids"; ValueType: string; ValueName: "VitoriusAudioFile"; ValueData: ""; Flags: uninsdeletevalue; Tasks: fileassoc
Root: HKA; Subkey: "Software\Classes\.wav\OpenWithProgids"; ValueType: string; ValueName: "VitoriusAudioFile"; ValueData: ""; Flags: uninsdeletevalue; Tasks: fileassoc
Root: HKA; Subkey: "Software\Classes\VitoriusAudioFile"; ValueType: string; ValueName: ""; ValueData: "Audio File (Vitorius Music Player)"; Flags: uninsdeletekey; Tasks: fileassoc
Root: HKA; Subkey: "Software\Classes\VitoriusAudioFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppBatName}"" ""%1"""; Tasks: fileassoc

[Run]
Filename: "{app}\{#MyAppBatName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent
