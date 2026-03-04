# Restore activities from latest backup to live storage.
# Run from Project PAT folder. Set REMOTE_STORAGE_BASE in .env or below.
# Usage: .\scripts\restore-activities-now.ps1

$env:REMOTE_STORAGE_USER = "ankit.kanwra@gupshup.io"
if (-not $env:REMOTE_STORAGE_BASE) {
    $env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
}
$env:RESTORE_KEYS = "activities"

$snapshot = "backups\storage-snapshot-2026-03-04.json"
if (-not (Test-Path $snapshot)) {
    $snapshot = "backups\storage-snapshot-latest.json"
}
if (-not (Test-Path $snapshot)) {
    Write-Host "No snapshot found. Run: node server/scripts/activity-count-in-backups.js"
    exit 1
}

Write-Host "Restoring activities from $snapshot ..."
node server/scripts/restore-storage-from-snapshot.js $snapshot
Write-Host "Done. Hard-refresh the app (Ctrl+Shift+R) to see activities."
