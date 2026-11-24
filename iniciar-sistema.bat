@echo off
chcp 65001 > nul
title Sistema de Gestao Comercial - Docker Local

echo ===================================================
echo     INICIANDO SISTEMA DE GESTAO COMERCIAL (DOCKER)
echo ===================================================
echo.

cd /d %~dp0

echo [1/3] Subindo containers via Docker Compose...
docker compose up -d

echo.
echo [2/3] Aguardando inicializacao dos servicos...
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Abrindo o navegador em http://localhost:3000 ...
start http://localhost:3000

echo.
echo ===================================================
echo   SISTEMA PRONTO!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001/api
echo   Health:   http://localhost:3001/api/health
echo   Postgres: localhost:5433
echo.
echo   Credenciais de Acesso:
echo   ADMIN:    admin@comercial.com   (senha: admin123)
echo   OPERADOR: operador@comercial.com (senha: operador123)
echo ===================================================
pause
