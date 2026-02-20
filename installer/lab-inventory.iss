#define AppName "Lab Inventory Management System"
#define AppVersion "1.0.0"
#define AppPublisher "Lab Inventory Systems"
#define AppExeName "start-hospital.bat"

[Setup]
AppId={{6D9719CC-1E03-47C3-9B7A-C476CF563FD8}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
; Must be writable because first-time setup installs backend dependencies.
DefaultDirName={localappdata}\Lab Inventory System
DefaultGroupName=Lab Inventory System
DisableProgramGroupPage=yes
LicenseFile=
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=LabInventorySetup
SetupIconFile=
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "runsetup"; Description: "Run first-time runtime setup after install"; GroupDescription: "After installation:"; Flags: checkedonce
Name: "startapp"; Description: "Start Lab Inventory after setup"; GroupDescription: "After installation:"

[Files]
Source: "..\release\lab-inventory-compiled\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\Lab Inventory - Start"; Filename: "{app}\start-hospital.bat"; WorkingDir: "{app}"
Name: "{group}\Lab Inventory - First-Time Setup"; Filename: "{app}\install-runtime-host.bat"; WorkingDir: "{app}"
Name: "{group}\Lab Inventory - Setup Guide"; Filename: "{app}\HOSPITAL_SETUP.md"; WorkingDir: "{app}"
Name: "{autodesktop}\Lab Inventory - Start"; Filename: "{app}\start-hospital.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\install-runtime-host.bat"; Description: "Run first-time runtime setup"; Flags: postinstall shellexec; Tasks: runsetup
Filename: "{app}\start-hospital.bat"; Description: "Start Lab Inventory"; Flags: postinstall shellexec; Tasks: startapp

[Code]
procedure InitializeWizard;
begin
  SuppressibleMsgBox(
    'Prerequisites (must be installed on this PC):' + #13#10 +
    '- Node.js LTS' + #13#10 +
    '- PostgreSQL (with database "lab_inventory")' + #13#10#13#10 +
    'This installer does not include those prerequisites.',
    mbInformation, MB_OK, IDOK
  );
end;
