<#
.SYNOPSIS
Bootstrap script for ForgeKit

.DESCRIPTION
Starts the entire system locally via Docker Compose and ensures health checks pass.
#>

Write-Host "===========================" -ForegroundColor Cyan
Write-Host "   ForgeKit Bootstrap      " -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Check if Docker is running
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/4] Starting infrastructure and services via Docker Compose..."
cd (Split-Path -Parent $MyInvocation.MyCommand.Path)
cd ../../infra/compose

# Spin up
docker-compose down
docker-compose up -d --build

Write-Host "`n[2/4] Synchronizing database schemas..."
# Set temporary DATABASE_URL for host-side Prisma execution
# In a real scenario, this would be environment-specific or loaded from .env
$env:DATABASE_URL = "postgresql://forgekit:secret@localhost:5432/example_db?schema=public"
cd ../../
pnpm --filter example-service run db:push --accept-data-loss

Write-Host "`n[3/4] Waiting for Gateway to report healthy..."
$maxRetries = 10
$retryCount = 0
$healthy = $false

while (-not $healthy -and $retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 3
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health/live" -Method Get -ErrorAction Stop
        if ($response.status -eq 'OK') {
            $healthy = $true
        }
    } catch {
        # Not ready yet
    }
    $retryCount++
    Write-Host "   Waiting... ($retryCount/$maxRetries)"
}

if (-not $healthy) {
    Write-Host "`nERROR: Gateway failed to report healthy within timeout." -ForegroundColor Red
    Write-Host "Run 'docker-compose logs' from infra/compose to debug."
    exit 1
}

Write-Host "`n[4/4] System is running!" -ForegroundColor Green
Write-Host "Gateway: http://localhost:3000"
Write-Host "Example Service: http://localhost:3001"
Write-Host "PostgreSQL: localhost:5432"
Write-Host "RabbitMQ Mgmt: http://localhost:15672 (forgekit:secret)"
