param([switch]$InstallSchedule, [switch]$Force)

$ErrorActionPreference = 'Stop'
$backupRoot = 'D:\Архивы\Дампы\smart_learning'
$project = '\\wsl.localhost\Ubuntu\home\pav\projects\smart_learning'
$scriptPath = Join-Path $project 'scripts\Backup-Wordwell.ps1'

if ($InstallSchedule) {
    try {
        $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At '12:00'
        $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $scriptPath)
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
        Register-ScheduledTask -TaskName 'Wordwell Weekly Backup' -Trigger $trigger -Action $action -Settings $settings -Description 'Weekly Wordwell PostgreSQL backup' -Force | Out-Null
        Write-Host 'Weekly backup scheduled for Sunday at 12:00 (Windows local time).'
    } catch {
        Write-Warning "Could not register Windows scheduled task: $_"
    }
}

$now = Get-Date
$due = $now.Date.AddDays(-[int]$now.DayOfWeek).AddHours(12)
if ($now -lt $due) { $due = $due.AddDays(-7) }
$week = $due.ToString('yyyyMMdd')
$marker = Join-Path (Join-Path $backupRoot $week) 'complete.txt'
if (-not $Force -and (Test-Path -LiteralPath $marker)) {
    Write-Host "Backup for week $week already exists."
    exit 0
}
if (-not (Test-Path -LiteralPath 'D:\')) { throw 'Drive D: is unavailable.' }
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$wslTarget = '/mnt/d/Архивы/Дампы/smart_learning'
$targetBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($wslTarget))
& wsl.exe -d Ubuntu --cd /home/pav/projects/smart_learning -- bash scripts/backup_databases.sh $targetBase64 $week
if ($LASTEXITCODE -ne 0) { throw "Database backup failed for week $week." }
