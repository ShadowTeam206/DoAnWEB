@echo off
title AI Relay Reset

cd /d C:\ai-relay

echo =========================
echo AI RELAY RESET START
echo =========================

where pm2
if %errorlevel% neq 0 (
    echo PM2 NOT FOUND
    pause
    exit /b 1
)

echo.
echo Clearing logs...
call pm2 flush

echo.
echo Deleting old process...
call pm2 delete ai-relay

echo.
echo Starting relay...
call pm2 start server.js --name ai-relay

echo.
echo Saving PM2...
call pm2 save

echo.
echo =========================
echo AI RELAY ONLINE - PM2 LOGS
echo Press Ctrl+C to stop viewing logs.
echo =========================
echo.
call pm2 logs ai-relay --lines 100

pause