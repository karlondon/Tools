@echo off
echo ============================================
echo   Gmail Image Extractor - Build Script
echo ============================================
echo.

REM Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Installing PyInstaller...
pip install pyinstaller>=6.0

echo.
echo Building standalone executable...
pyinstaller --onefile --name GmailImageExtractor --console gmail_image_extractor.py

echo.
if exist "dist\GmailImageExtractor.exe" (
    echo SUCCESS! Executable created at:
    echo   dist\GmailImageExtractor.exe
    echo.
    echo You can copy this .exe file anywhere and run it.
) else (
    echo BUILD FAILED. Check errors above.
)

echo.
pause