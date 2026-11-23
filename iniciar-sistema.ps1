# Script PowerShell para iniciar o Sistema de Gestão Comercial Localmente
$root = $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    INICIANDO SISTEMA DE GESTÃO COMERCIAL          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Iniciar Backend
Write-Host "[1/2] Iniciando Backend API NestJS na porta 3001..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\backend`" && npm run start:dev"

Start-Sleep -Seconds 4

# 2. Iniciar Frontend
Write-Host "[2/2] Iniciando Frontend React/Vite na porta 3000..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\frontend`" && npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Abrindo navegador em http://localhost:3000 ..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  SISTEMA PRONTO!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001/api" -ForegroundColor White
Write-Host ""
Write-Host "  Credenciais de Demonstração:" -ForegroundColor White
Write-Host "  ADMIN:    admin@comercial.com   (senha: admin123)" -ForegroundColor White
Write-Host "  OPERADOR: operador@comercial.com (senha: operador123)" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
