@echo off
title PM2 SHUTDOWN

echo =========================
echo SHUTTING DOWN PM2 COMPLETELY
echo =========================

where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo PM2 NOT FOUND
    pause
    exit /b 1
)

echo.
echo Deleting all PM2 processes...
call pm2 delete all
echo.
echo Killing PM2 daemon...
call pm2 kill

echo.
echo =========================
echo PM2 HAS BEEN FULLY STOPPED
echo =========================

pause
