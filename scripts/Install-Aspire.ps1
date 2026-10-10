[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$version = '13.6.1'
$platform = if ($IsWindows) { 'win' } elseif ($IsLinux) { 'linux' } else {
    throw 'This rehearsal installer supports Windows and Linux x64.'
}
if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -ne 'X64') {
    throw 'Use an x64 host for the pinned presenter/CI baseline.'
}
$extension = if ($IsWindows) { 'zip' } else { 'tar.gz' }
$name = "aspire-cli-$platform-x64-$version.$extension"
$expected = if ($IsWindows) {
    'f239ba3729e306f11e62eea47abdb6bc1a95ca82e730cb7bda1a24b92a9579b3052736573e7921dda5ea8f57398914e93b34957608e5c2a03012ec51f515810a'
} else {
    'b512ae977c62f3b83f59636b4d03660d96284dba491bd7f9f070006a8840e4f1ba8addc5b4acb11eadd01fab431002703f1655c10c6fd913f77baa580c6fa2a1'
}
$directory = Join-Path $root '.tools\aspire'
$archive = Join-Path $root ".tools\$name"
$binaryName = if ($IsWindows) { 'aspire.exe' } else { 'aspire' }
$binary = Join-Path $directory $binaryName
$marker = Join-Path $directory 'verified-sha512.txt'

if ((Test-Path $binary) -and (Test-Path $marker) -and
    (Get-Content $marker -Raw).Trim() -eq $expected) {
    Write-Output $binary
    return
}

New-Item -ItemType Directory -Path $directory -Force | Out-Null
$url = "https://github.com/microsoft/aspire/releases/download/v$version/$name"
Invoke-WebRequest $url -OutFile $archive
$actual = (Get-FileHash $archive -Algorithm SHA512).Hash.ToLowerInvariant()
if ($actual -ne $expected) {
    throw "SHA512 mismatch for $name. The archive will not be executed."
}
if ($IsWindows) {
    Expand-Archive $archive -DestinationPath $directory -Force
} else {
    & tar -xzf $archive -C $directory
    if ($LASTEXITCODE -ne 0) { throw 'Aspire archive extraction failed.' }
}
if (-not (Test-Path $binary)) {
    throw "The verified archive did not contain $binaryName at its expected location."
}
Set-Content $marker $expected -NoNewline
Write-Output $binary
