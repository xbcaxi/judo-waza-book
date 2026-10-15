# The daily collection: snapshot, collect, rebuild review-page.html. Run by
# Task Scheduler after the YouTube quota resets at midnight Pacific time;
# writes daily.log beside this file. Labelling and republishing the page are
# done in a Claude Code session, as the README describes.

$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
$env:PYTHONIOENCODING = 'utf-8'
Start-Transcript -Path (Join-Path $PSScriptRoot 'daily.log') -Append | Out-Null

# The copy the page compares against to mark what this round found. Kept
# when the last round's page has not been republished yet, so its finds stay new.
if (-not (Test-Path candidates.before.sqlite) -or (Test-Path published.flag)) {
    Copy-Item candidates.sqlite candidates.before.sqlite -Force
    Remove-Item published.flag -ErrorAction SilentlyContinue
}

foreach ($step in @('extract_edges.py', 'index_channels.py --details', 'match_edges.py', 'search_gaps.py')) {
    Write-Output "-- python $step"
    Invoke-Expression "python $step" 2>&1 | Select-Object -Last 3
}
python review_page.py build

Stop-Transcript | Out-Null
