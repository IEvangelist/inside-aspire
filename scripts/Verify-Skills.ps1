[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$expectedNames = @(
    'aspire', 'aspire-deployment', 'aspire-init', 'aspire-monitoring',
    'aspire-orchestration', 'aspire-project-v2-migration', 'aspireify'
)
$actualNames = @(Get-ChildItem (Join-Path $root '.github\skills') -Directory |
    Select-Object -ExpandProperty Name | Sort-Object)
if (Compare-Object ($expectedNames | Sort-Object) $actualNames) {
    throw 'The complete seven default Aspire skills are required.'
}
$lines = @(Get-Content (Join-Path $root 'docs\skills-manifest.sha256'))
$seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($line in $lines) {
    if ($line -notmatch '^([a-f0-9]{64})  (\.github/skills/[^\\]+)$') {
        throw "Malformed official skill manifest entry: $line"
    }
    $expected = $Matches[1]
    $relative = $Matches[2]
    if ($relative.Contains('../') -or -not $seen.Add($relative)) {
        throw "Unsafe or duplicate skill manifest path: $relative"
    }
    $file = Join-Path $root $relative.Replace('/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path $file -PathType Leaf)) { throw "Missing skill file: $relative" }
    $actual = (Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "Official skill file was modified: $relative" }
}
$files = @(Get-ChildItem (Join-Path $root '.github\skills') -Recurse -File)
if ($files.Count -ne $seen.Count) { throw 'The official skill tree contains unexpected files.' }
foreach ($name in $expectedNames) {
    if (-not $seen.Contains(".github/skills/$name/SKILL.md")) {
        throw "Missing skill entry point: $name"
    }
}
Write-Host "Verified seven complete, unchanged official skills ($($files.Count) files)."
