$ErrorActionPreference = "Stop"

$backendUrl = "http://localhost:4000/api/health"
$frontendUrl = "http://localhost:8080"

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
