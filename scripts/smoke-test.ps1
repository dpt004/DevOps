$ErrorActionPreference = "Stop"

$backendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "4000" }
$frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "8080" }

$backendUrl = "http://localhost:$backendPort/api/health"
$frontendUrl = "http://localhost:$frontendPort"

Write-Host "Checking backend: $backendUrl"
$backend = Invoke-RestMethod -Uri $backendUrl -TimeoutSec 5

if ($backend.status -ne "ok") {
    throw "Backend health check failed."
}

Write-Host "Checking frontend: $frontendUrl"
$frontend = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 5 -UseBasicParsing

if ($frontend.StatusCode -ne 200) {
    throw "Frontend health check failed."
}

Write-Host "Smoke test passed."
