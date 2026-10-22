param([int]$Limit = 0, [switch]$InstallSchedule)

$ErrorActionPreference = 'Stop'
$scriptPath = '\\wsl.localhost\Ubuntu\home\pav\projects\smart_learning\scripts\Generate-UsAudio.ps1'
if ($InstallSchedule) {
    try {
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
        $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $scriptPath)
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
        Register-ScheduledTask -TaskName 'Wordwell Word Enrichment' -Trigger $trigger -Action $action -Settings $settings -Description 'Add examples and US audio for new Wordwell words' -Force | Out-Null
        Start-ScheduledTask -TaskName 'Wordwell Word Enrichment'
        Write-Host 'Word enrichment scheduled every 10 minutes and started now.'
    } catch {
        Write-Warning "Could not register enrichment task: $_"
    }
    return
}
try { Invoke-RestMethod -Uri 'http://localhost:8001/health' -TimeoutSec 5 | Out-Null }
catch { Write-Host 'Wordwell is offline; enrichment will resume next time.'; exit 0 }
& wsl.exe -d Ubuntu --cd /home/pav/projects/smart_learning -- .venv/bin/python scripts/sync_examples.py --limit 100
if ($LASTEXITCODE -ne 0) { Write-Warning 'Example lookup failed; it will retry later.' }
& wsl.exe -d Ubuntu --cd /home/pav/projects/smart_learning -- .venv/bin/python scripts/sync_pronunciations.py --limit 50
if ($LASTEXITCODE -ne 0) { Write-Warning 'Wiktionary audio lookup failed; it will retry later.' }
Add-Type -AssemblyName System.Speech
$project = '\\wsl.localhost\Ubuntu\home\pav\projects\smart_learning'
$destination = Join-Path $project 'data\pronunciation'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$words = (Invoke-RestMethod -Uri 'http://localhost:8001/words?limit=10000' -TimeoutSec 60).items
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $speaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq 'Microsoft Zira Desktop' } | Select-Object -First 1
if (-not $voice) { $voice = $speaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'en-US' } | Select-Object -First 1 }
if (-not $voice) { throw 'No American English voice is installed in Windows.' }
$speaker.SelectVoice($voice.VoiceInfo.Name)
$speaker.Rate = -1
$generated = 0
$skipped = 0
try {
    foreach ($word in $words) {
        $output = Join-Path $destination ($word.id + '.wav')
        if (Test-Path -LiteralPath $output) { $skipped++; continue }
        $speaker.SetOutputToWaveFile($output)
        try { $speaker.Speak([string]$word.english) }
        finally { $speaker.SetOutputToNull() }
        if ((Get-Item -LiteralPath $output).Length -lt 100) { throw "Empty recording for $($word.english)" }
        $generated++
        if ($generated % 100 -eq 0) { Write-Host "Generated $generated; skipped $skipped; total $($words.Count)" }
        if ($Limit -gt 0 -and $generated -ge $Limit) { break }
    }
} finally { $speaker.Dispose() }
Write-Host "US voice: $($voice.VoiceInfo.Name). Generated $generated; already present $skipped; dictionary $($words.Count)."
