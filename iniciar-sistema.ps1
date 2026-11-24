# Script PowerShell para iniciar o Sistema de Gestão Comercial Localmente
$root = $PSScriptRoot
Set-Location $root

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    INICIANDO SISTEMA DE GESTÃO COMERCIAL (DOCKER) " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Garantir variáveis de ambiente do PATH para docker
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 2. Iniciar containers com Docker Compose
Write-Host "[1/3] Verificando e iniciando containers Docker..." -ForegroundColor Yellow
docker compose up -d

# 3. Aguardar serviços ficarem saudáveis
Write-Host "[2/3] Aguardando inicialização completa dos serviços..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempt++
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($res.status -eq "ok") {
            $healthy = $true
            break
        }
    } catch {}
}

if ($healthy) {
    Write-Host "✅ Backend e Banco de Dados 100% saudáveis!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Os containers ainda estão inicializando ou requerem verificação." -ForegroundColor Yellow
}

# 4. Abrir navegador
Write-Host "[3/3] Abrindo navegador em http://localhost:3000 ..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  SISTEMA PRONTO PARA USO!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001/api" -ForegroundColor White
Write-Host "  Health:   http://localhost:3001/api/health" -ForegroundColor White
Write-Host "  Postgres: localhost:5433" -ForegroundColor White
Write-Host ""
Write-Host "  Credenciais de Demonstração:" -ForegroundColor White
Write-Host "  ADMIN:    admin@comercial.com   (senha: admin123)" -ForegroundColor White
Write-Host "  OPERADOR: operador@comercial.com (senha: operador123)" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
