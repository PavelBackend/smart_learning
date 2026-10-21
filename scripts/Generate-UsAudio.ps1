param([int]$Limit = 0)

$ErrorActionPreference = 'Stop'
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
