#Requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateSet('win-x64', 'linux-x64')]
    [string] $RuntimeIdentifier = $(if ($IsWindows) { 'win-x64' } else { 'linux-x64' })
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$demo = Join-Path $root 'demo'
$output = Join-Path $demo ".artifacts\native\$RuntimeIdentifier"

if (($RuntimeIdentifier -eq 'win-x64' -and !$IsWindows) -or
    ($RuntimeIdentifier -eq 'linux-x64' -and !$IsLinux)) {
    throw "NativeAOT does not cross-compile operating systems. Publish $RuntimeIdentifier on its matching x64 host."
}
if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
    throw 'This demo supports native x64 publishing only.'
}

$vcvars = $null
if ($IsWindows) {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (!(Test-Path $vswhere)) {
        throw 'Windows NativeAOT requires existing Visual Studio C++ Build Tools and a Windows SDK. No system tools are installed by this script.'
    }
    $installation = (& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1)
    if (!$installation) { throw 'No installed x64 Visual C++ toolchain was found.' }
    $vcvars = Join-Path $installation 'VC\Auxiliary\Build\vcvars64.bat'
    if (!(Test-Path $vcvars)) { throw "Missing native compiler environment: $vcvars" }
} elseif (!(Get-Command clang -ErrorAction SilentlyContinue)) {
    throw 'Linux NativeAOT requires an existing clang toolchain and zlib development files; provision those on the CI runner first.'
}

Push-Location (Join-Path $demo 'frontend')
try {
    if (!(Test-Path 'node_modules\.bin\tsc') -and !(Test-Path 'node_modules\.bin\tsc.cmd')) {
        & npm ci --no-audit --no-fund --registry=https://registry.npmjs.org
        if ($LASTEXITCODE -ne 0) { throw 'Locked frontend dependency restore failed.' }
    }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'The preserved React frontend build failed.' }
} finally {
    Pop-Location
}

function Publish-Project([string] $Project, [string] $Destination) {
    $arguments = @('publish', $Project, '--configuration', 'Release', '--runtime', $RuntimeIdentifier,
        '--self-contained', 'true', '--output', $Destination,
        '-p:ContinuousIntegrationBuild=true', '-p:TreatWarningsAsErrors=true',
        '-p:ILLinkTreatWarningsAsErrors=true', '--nologo')
    if ($IsWindows) {
        $quoted = ($arguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
        # vcvars and the native compiler must run in the SAME cmd.exe process.
        $installerDirectory = Split-Path $vswhere -Parent
        & $env:ComSpec /d /s /c "set `"PATH=$installerDirectory;%PATH%`" && call `"$vcvars`" >nul && dotnet $quoted"
    } else {
        & dotnet @arguments
    }
    if ($LASTEXITCODE -ne 0) { throw "NativeAOT publishing failed for $Project." }
}

Publish-Project (Join-Path $demo 'Weather.Api\Weather.Api.csproj') $output
Publish-Project (Join-Path $demo 'Weather.Fixtures\Weather.Fixtures.csproj') (Join-Path $output 'fixtures')

$extension = if ($IsWindows) { '.exe' } else { '' }
foreach ($path in @((Join-Path $output "Weather.Api$extension"),
    (Join-Path $output "fixtures\Weather.Fixtures$extension"))) {
    if (!(Test-Path $path)) { throw "Native executable was not published: $path" }
}
if (!(Test-Path (Join-Path $output 'wwwroot\index.html'))) {
    throw 'Native publish is missing the bundled React frontend.'
}
Write-Host "Native artifacts: $output"
Write-Host 'Next: pwsh -File scripts\Test-Native.ps1'
