@echo off
chcp 65001 >nul
echo ========================================================
echo   FPREP LMS - AUTO SYNC GITHUB ^& VERCEL
echo ========================================================

cd /d "%~dp0"

echo [1/3] Kiem tra thay doi ma nguon...
git status -s

set /p COMMIT_MSG="Nhap noi dung commit (Enter de bo trong mac dinh: 'auto-update'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=auto-update: cap nhat du an

echo.
echo [2/3] Dang them va commit code...
git add .
git commit -m "%COMMIT_MSG%"

echo.
echo [3/3] Dang day code len GitHub (origin main)...
git push origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   THANH CONG: Code da day len GitHub!
    echo   Vercel se tu dong nhan commit va build deploy ngay.
    echo ========================================================
) else (
    echo.
    echo [LOI] Khong the day code len GitHub. Vui long kiem tra lai ket noi hoac quyen truy cap.
)

pause
