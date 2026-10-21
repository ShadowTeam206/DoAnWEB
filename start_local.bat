@echo off

title AI Relay Local Start

cd /d C:\Users\ADMIN\Desktop\HoiDap\DoAn

echo =========================

echo AI RELAY LOCAL START

echo =========================

echo.

echo Checking Node.js...

where node

if %errorlevel% neq 0 (

    echo NODE.JS NOT FOUND

    pause

    exit /b 1

)

echo.

echo Starting local server...

echo Press Ctrl + C to stop.

echo.

node server.js

echo.

echo Server stopped.

pause