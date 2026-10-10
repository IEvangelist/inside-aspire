#Requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateSet('win-x64', 'linux-x64')]
    [string] $RuntimeIdentifier = $(if ($IsWindows) { 'win-x64' } else { 'linux-x64' }),
    [switch] $UseFixtures,
    [ValidateSet('Json', 'Table')]
    [string] $Format = 'Table'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$cliName = if ($IsWindows) { 'aspire.exe' } else { 'aspire' }
$cli = Join-Path $root ".tools\aspire\$cliName"
$apphost = Join-Path $root 'demo\host\apphost.cs'
if (!(Test-Path $cli)) {
    throw 'The private public Aspire CLI is missing. Run scripts\Install-Aspire.ps1 first.'
}
$version = (& $cli --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^13\.6\.1(?:\+.*)?$') {
    throw 'This demo requires the repository-private public Aspire CLI 13.6.1; the global CLI is never used.'
}
$fixtureFlag = $UseFixtures.IsPresent.ToString().ToLowerInvariant()
& $cli start --apphost $apphost --isolated --non-interactive --launch-profile http --format $Format -- `
    "--NativeRuntimeIdentifier=$RuntimeIdentifier" "--UseFixtures=$fixtureFlag"
if ($LASTEXITCODE -ne 0) { throw 'Aspire could not start the exact native weather AppHost.' }
