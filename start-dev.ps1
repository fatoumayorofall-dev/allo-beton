# Script pour démarrer le backend et frontend simultanément
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Démarrage du projet Allo Béton" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Arrêter les processus Node existants
Write-Host "Arrêt des processus Node existants..." -ForegroundColor Yellow
taskkill /F /IM node.exe -ErrorAction SilentlyContinue | Out-Null
Start-Sleep -Seconds 2

# Démarrer le backend
Write-Host "`nDémarrage du backend (port 3001)..." -ForegroundColor Green
$backendJob = Start-Process -NoNewWindow -PassThru -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "c:\wamp\www\project - Copie\backend"
Write-Host "Backend PID: $($backendJob.Id)" -ForegroundColor Green

# Attendre que le backend soit prêt
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "Démarrage du frontend (port 5173)..." -ForegroundColor Green
$frontendJob = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "c:\wamp\www\project - Copie"
Write-Host "Frontend PID: $($frontendJob.Id)" -ForegroundColor Green

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ Les deux serveurs sont lancés!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Magenta
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Magenta
Write-Host "`nAppuyez sur Ctrl+C pour arrêter..." -ForegroundColor Yellow

# Garder le script actif
while ($true) {
    Start-Sleep -Seconds 10
    
    # Vérifier si les processus sont toujours actifs
    $backendActive = Get-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    $frontendActive = Get-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
    
    if (-not $backendActive) {
        Write-Host "⚠️  Le backend s'est arrêté!" -ForegroundColor Red
        break
    }
    
    if (-not $frontendActive) {
        Write-Host "⚠️  Le frontend s'est arrêté!" -ForegroundColor Red
        break
    }
}
