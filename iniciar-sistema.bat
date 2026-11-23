@echo off
chcp 65001 > nul
title Sistema de Gestao Comercial - Inicializador Local

echo ===================================================
echo     INICIANDO SISTEMA DE GESTAO COMERCIAL
echo ===================================================
echo.

REM 1. Iniciar Backend na porta 3001
echo [1/2] Iniciando Backend API NestJS na porta 3001...
start "Backend API (Porta 3001)" cmd /k "cd /d %~dp0backend && npm run start:dev"

REM Aguardar 5 segundos para o backend inicializar
timeout /t 5 /nobreak > nul

REM 2. Iniciar Frontend na porta 3000
echo [2/2] Iniciando Frontend React/Vite na porta 3000...
start "Frontend Web (Porta 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Aguardar 3 segundos e abrir o navegador
timeout /t 3 /nobreak > nul
echo.
echo Abrindo o navegador em http://localhost:3000 ...
start http://localhost:3000

echo.
echo ===================================================
echo   SISTEMA PRONTO!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001/api
echo.
echo   Credenciais de Acesso:
echo   ADMIN:    admin@comercial.com   (senha: admin123)
echo   OPERADOR: operador@comercial.com (senha: operador123)
echo ===================================================
pause
