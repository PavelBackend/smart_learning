@echo off
setlocal

if /I "%~1"=="start" goto start
if /I "%~1"=="stop" goto stop

:menu
cls
echo.
echo   =============================
echo          WORDWELL
echo   =============================
echo.
echo   [1] Start site
echo   [2] Stop site
echo   [Q] Exit
echo.
choice /c 12Q /n /m "Select: "
if errorlevel 3 goto end
if errorlevel 2 goto stop
if errorlevel 1 goto start

:start
echo.
echo Starting Wordwell and applying migrations...
wsl.exe -d Ubuntu --cd /home/pav/projects/smart_learning -- make up
if errorlevel 1 goto failed
echo.
set "FRONTEND_ADDR="
for /f "delims=" %%P in ('wsl.exe -d Ubuntu --cd /home/pav/projects/smart_learning -- docker compose port frontend 80') do set "FRONTEND_ADDR=%%P"
if not defined FRONTEND_ADDR goto failed
echo Wordwell is ready at http://%FRONTEND_ADDR%/
start "" "http://%FRONTEND_ADDR%/"
if /I "%~1"=="start" goto end
pause
goto menu

:stop
echo.
echo Stopping Wordwell...
wsl.exe -d Ubuntu --cd /home/pav/projects/smart_learning -- make down
if errorlevel 1 goto failed
echo.
echo Wordwell stopped. Database data is preserved.
if /I "%~1"=="stop" goto end
pause
goto menu

:failed
echo.
echo The command failed. Check that Docker Desktop and WSL Ubuntu are running.
if not "%~1"=="" exit /b 1
pause
goto menu

:end
endlocal
