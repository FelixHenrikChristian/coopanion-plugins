@echo off
setlocal
set "COO_PROGRAM=%~1"
if not defined COO_PROGRAM set /p "COO_PROGRAM=Coopanion installation directory: "
if not exist "%COO_PROGRAM%\Coopanion.exe" (
  echo Coopanion.exe not found. Enter the folder containing the executable.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE=1"
"%COO_PROGRAM%\Coopanion.exe" "%~dp0install-local.cjs" "%COO_PROGRAM%"
if errorlevel 1 (
  echo Installation failed. See the error above.
) else (
  echo Installed as a World extension. Restart the Core process once.
)
pause
