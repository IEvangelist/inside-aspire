#Requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateSet('win-x64', 'linux-x64')]
    [string] $RuntimeIdentifier = $(if ($IsWindows) { 'win-x64' } else { 'linux-x64' }),
    [switch] $UseRunningAppHost,
    [switch] $SkipBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$demo = Join-Path $root 'demo'
$cliName = if ($IsWindows) { 'aspire.exe' } else { 'aspire' }
$cli = Join-Path $root ".tools\aspire\$cliName"
$apphost = Join-Path $demo 'host\apphost.cs'
$artifacts = Join-Path $demo ".artifacts\native\$RuntimeIdentifier"
$verification = Join-Path $demo '.artifacts\verification'
$extension = if ($IsWindows) { '.exe' } else { '' }
$script:checks = 0
$started = $false

function Assert-That([bool] $Condition, [string] $Message) {
    if (!$Condition) { throw "Native verification failed: $Message" }
    $script:checks++
}

function Assert-Native([string] $Path) {
    Assert-That (Test-Path $Path) "Missing artifact $Path. Run scripts\Publish-Native.ps1 first."
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($IsWindows) {
        Assert-That ($bytes.Length -gt 256 -and $bytes[0] -eq 77 -and $bytes[1] -eq 90) 'Artifact is not a PE executable.'
        $pe = [BitConverter]::ToInt32($bytes, 60)
        Assert-That ([BitConverter]::ToUInt32($bytes, $pe) -eq 17744) 'Invalid PE signature.'
        Assert-That ([BitConverter]::ToUInt16($bytes, $pe + 4) -eq 34404) 'Artifact is not x64.'
        $optional = $pe + 24
        Assert-That ([BitConverter]::ToUInt16($bytes, $optional) -eq 523) 'Expected PE32+ native executable.'
        $clr = $optional + 112 + 14 * 8
        Assert-That ([BitConverter]::ToUInt32($bytes, $clr) -eq 0 -and
            [BitConverter]::ToUInt32($bytes, $clr + 4) -eq 0) 'Managed CLR header found; this is not NativeAOT.'
    } else {
        Assert-That ($bytes.Length -gt 64 -and $bytes[0] -eq 127 -and
            [System.Text.Encoding]::ASCII.GetString($bytes, 1, 3) -eq 'ELF') 'Artifact is not ELF.'
        Assert-That ($bytes[4] -eq 2 -and [BitConverter]::ToUInt16($bytes, 18) -eq 62) 'Expected native x64 ELF.'
    }
}

function Invoke-AspireJson([string[]] $Arguments) {
    $output = @(& $cli @Arguments --non-interactive --nologo)
    if ($LASTEXITCODE -ne 0) { throw "Private Aspire command failed: $($Arguments -join ' ')" }
    $text = $output -join "`n"
    $match = [regex]::Match($text, '(?s)(\{\s*"[^"]+".*\}|\[\s*(?:\{.*\})?\s*\])\s*$')
    if (!$match.Success) { throw 'Aspire did not return the requested JSON result.' }
    return ConvertFrom-Json $match.Value
}

function Get-Resource([string] $Name) {
    $description = Invoke-AspireJson @('describe', $Name, '--apphost', $apphost, '--format', 'Json')
    $resources = if ($description.resources) { @($description.resources) } else { @($description) }
    $resource = @($resources | Where-Object { $_.displayName -eq $Name -or $_.name -eq $Name })
    if ($resource.Count -ne 1) { throw "Expected one resource named $Name in exact AppHost describe output." }
    return $resource[0]
}

function Get-Endpoint($Resource) {
    $endpoints = if ($Resource.endpoints) { @($Resource.endpoints) } else { @($Resource.urls) }
    $endpoint = @($endpoints | Where-Object { $_.name -eq 'http' -and $_.url })
    if ($endpoint.Count -ne 1) { throw "No unique HTTP endpoint in describe for $($Resource.name)." }
    return $endpoint[0].url.TrimEnd('/')
}

function Request([string] $Url, [int] $Status = 200) {
    $response = Invoke-WebRequest $Url -SkipHttpErrorCheck -TimeoutSec 20
    Assert-That ($response.StatusCode -eq $Status) "$Url returned $($response.StatusCode), expected $Status."
    return $response
}

function Json([string] $Url, [int] $Status = 200) {
    $response = Request $Url $Status
    Assert-That ([string]$response.Headers['Content-Type'] -like 'application/json*') 'Expected JSON content type.'
    return ConvertFrom-Json $response.Content
}

function Error-Envelope([string] $Url, [int] $Status, [string] $Expected) {
    $body = Json $Url $Status
    Assert-That ($body.error -ceq $Expected -and @($body.PSObject.Properties).Count -eq 1) 'Original {error} envelope was not preserved.'
}

Assert-That (Test-Path $cli) 'Install the private public Aspire CLI with scripts\Install-Aspire.ps1.'
$version = (& $cli --version | Out-String).Trim()
Assert-That ($LASTEXITCODE -eq 0 -and $version -match '^13\.6\.1(?:\+.*)?$') 'Only public private CLI 13.6.1 is supported.'
Assert-Native (Join-Path $artifacts "Weather.Api$extension")
Assert-Native (Join-Path $artifacts "fixtures\Weather.Fixtures$extension")
foreach ($managed in 'Weather.Api.dll', 'Weather.Api.deps.json', 'Weather.Api.runtimeconfig.json') {
    Assert-That (!(Test-Path (Join-Path $artifacts $managed))) "Managed fallback artifact $managed is present."
}
Assert-That (Test-Path (Join-Path $artifacts 'wwwroot\index.html')) 'Published native artifact has no React bundle.'

$originalFrontend = Join-Path $demo 'upstream\frontend'
foreach ($file in Get-ChildItem $originalFrontend -Recurse -File) {
    $relative = [System.IO.Path]::GetRelativePath($originalFrontend, $file.FullName)
    if ($relative -eq 'vite.config.ts') { continue }
    $copy = Join-Path (Join-Path $demo 'frontend') $relative
    Assert-That ((Get-FileHash $file.FullName).Hash -eq (Get-FileHash $copy).Hash) "Pinned UI file changed: $relative"
}

New-Item -ItemType Directory -Force $verification | Out-Null
$results = Join-Path $verification 'managed-parity.trx'
if (Test-Path $results) { Remove-Item $results }
& dotnet test (Join-Path $demo 'Weather.Tests\Weather.Tests.csproj') --configuration Release --nologo `
    --verbosity minimal --results-directory $verification --logger 'trx;LogFileName=managed-parity.trx'
if ($LASTEXITCODE -ne 0) { throw 'Managed parity tests failed.' }

try {
    if (!$UseRunningAppHost) {
        $running = @(Invoke-AspireJson @('ps', '--format', 'Json'))
        $existing = @($running | Where-Object {
            $_.appHostPath -eq $apphost -or $_.appHostProjectPath -eq $apphost -or $_.path -eq $apphost
        })
        if ($existing.Count) {
            throw 'This exact AppHost is already running. Use -UseRunningAppHost to verify it without taking ownership or stopping it.'
        }
        & (Join-Path $PSScriptRoot 'Start-Demo.ps1') -RuntimeIdentifier $RuntimeIdentifier -UseFixtures -Format Json
        $started = $true
    }
    foreach ($resource in 'provider-fixture', 'api', 'frontend') {
        & $cli wait $resource --apphost $apphost --status healthy --timeout 120 --non-interactive --nologo
        if ($LASTEXITCODE -ne 0) { throw "Resource $resource did not become healthy." }
    }
    $apiResource = Get-Resource 'api'
    $frontendResource = Get-Resource 'frontend'
    $fixtureResource = Get-Resource 'provider-fixture'
    $api = Get-Endpoint $apiResource
    $frontend = Get-Endpoint $frontendResource
    $fixture = Get-Endpoint $fixtureResource
    Write-Host "Describe endpoints: api=$api frontend=$frontend provider-fixture=$fixture"
    Invoke-WebRequest "$fixture/__fixture/reset" -Method Post -TimeoutSec 10 | Out-Null

    $health = Request "$api/health"
    Assert-That ($health.Content -ceq 'Healthy' -and [string]$health.Headers['Content-Type'] -like 'text/plain*') 'Health text differs from the pinned sample.'
    $weather = Json "$api/api/weather?lat=47.6&lon=-122.3"
    Assert-That ($weather.location.name -ceq 'Fixture City') 'Reverse-geocode city mapping failed.'
    Assert-That ($weather.location.region -ceq 'Fixture Region' -and $weather.location.country -ceq 'Fixture Country') 'Reverse-geocode metadata mapping failed.'
    Assert-That ($weather.location.latitude -eq 47.6 -and $weather.location.longitude -eq -122.3) 'Coordinates changed.'
    Assert-That ($weather.location.timezone -ceq 'Pacific/Auckland') 'Provider timezone changed.'
    Assert-That ($weather.current.time -ceq '2026-04-23T11:37') 'Current wall-clock time was converted to UTC.'
    Assert-That ($weather.current.temperatureC -eq 21.5 -and $weather.current.apparentC -eq 20 -and
        $weather.current.humidity -eq 68 -and $weather.current.weatherCode -eq 2 -and
        $weather.current.windSpeedKph -eq 13.2 -and $weather.current.uvIndex -eq 4.5 -and
        $weather.current.isDay) 'Current-condition parity failed.'
    Assert-That ($weather.sun.sunrise -ceq '2026-04-23T06:24' -and
        $weather.sun.sunset -ceq '2026-04-23T17:43') 'Sun times were converted or changed.'
    Assert-That ($weather.hourly.Count -eq 12 -and $weather.hourly[0].time -ceq '2026-04-23T11:00' -and
        $weather.hourly[-1].time -ceq '2026-04-23T22:00') 'Upcoming-hour selection failed.'
    Assert-That ($null -eq $weather.hourly[3].temperatureC -and $weather.hourly[4].weatherCode -eq 0) 'Hourly null/default handling failed.'
    Assert-That ($weather.daily.Count -eq 5 -and $weather.daily[-1].date -ceq '2026-04-27') 'Five-day selection failed.'
    Assert-That ($null -eq $weather.daily[2].minC -and $weather.daily[2].weatherCode -eq 0 -and
        $null -eq $weather.daily[3].precipitationProb) 'Sparse daily arrays were not preserved.'

    foreach ($case in @(
        @{ Query = 'lat=&lon='; Lat = 0; Lon = 0 },
        @{ Query = 'lat=%20&lon=-0'; Lat = 0; Lon = 0 },
        @{ Query = 'lat=%EF%BB%BF47%C2%A0&lon=-122.3'; Lat = 47; Lon = -122.3 },
        @{ Query = 'lat=0x2f&lon=180'; Lat = 47; Lon = 180 },
        @{ Query = 'lat=0b100000&lon=0'; Lat = 32; Lon = 0 },
        @{ Query = 'lat=0o77&lon=0'; Lat = 63; Lon = 0 },
        @{ Query = 'lat=%2B4.7e1&lon=-180'; Lat = 47; Lon = -180 },
        @{ Query = 'lat=.5&lon=1.'; Lat = 0.5; Lon = 1 },
        @{ Query = 'lat=90&lon=180'; Lat = 90; Lon = 180 },
        @{ Query = 'lat=-90&lon=-180'; Lat = -90; Lon = -180 },
        @{ Query = 'lat=47&LAT=1&lon=0'; Lat = 47; Lon = 0 }
    )) {
        $result = Json "$api/api/weather?$($case.Query)"
        Assert-That ($result.location.latitude -eq $case.Lat -and $result.location.longitude -eq $case.Lon) "JavaScript coordinate coercion differs for $($case.Query)."
    }
    $coordinateError = "Query params 'lat' (-90..90) and 'lon' (-180..180) are required."
    foreach ($query in 'lon=0', 'lat=0', 'lat=91&lon=0', 'lat=0&lon=-181', 'lat=NaN&lon=0',
        'lat=Infinity&lon=0', 'lat=1e9999&lon=0', 'lat=12junk&lon=0', 'lat=-0x1&lon=0',
        'lat=0b2&lon=0', 'lat=1%2C2&lon=0', 'lat=47&lat=48&lon=0', 'LAT=47&lon=0',
        'lat%5B%5D=47&lon=0', 'lat=%C2%852%C2%85&lon=0', '?lat=47&lon=0') {
        Error-Envelope "$api/api/weather?$query" 400 $coordinateError
    }

    $empty = Json "$api/api/weather?lat=8&lon=0"
    Assert-That ($null -eq $empty.current.time -and $null -eq $empty.current.temperatureC -and
        $empty.current.weatherCode -eq 0 -and !$empty.current.isDay -and
        $null -eq $empty.location.timezone -and $null -eq $empty.sun.sunrise -and
        $empty.hourly.Count -eq 0 -and $empty.daily.Count -eq 0) 'Missing upstream fields did not yield explicit nulls and empty arrays.'
    Assert-That (@($empty.current.PSObject.Properties).Count -eq 8 -and
        @($empty.location.PSObject.Properties).Count -eq 6 -and @($empty.sun.PSObject.Properties).Count -eq 2) 'Null fields were omitted.'
    $past = Json "$api/api/weather?lat=9&lon=0"
    Assert-That ($past.hourly[0].time -ceq '2026-04-23T00:00') 'All-past-hour fallback differs.'
    foreach ($lat in 1, 3, 12) {
        $degraded = Json "$api/api/weather?lat=$lat&lon=0"
        Assert-That ($null -eq $degraded.location.name -and $null -eq $degraded.location.region -and
            $null -eq $degraded.location.country) 'Reverse failure or missing metadata did not degrade to nulls.'
    }
    Assert-That ((Json "$api/api/weather?lat=10&lon=0").location.name -ceq 'Fallback Locality') 'Locality fallback failed.'
    Assert-That ((Json "$api/api/weather?lat=11&lon=0").location.name -ceq 'Fallback Region') 'Region fallback failed.'
    foreach ($lat in 4, 5, 7) {
        Error-Envelope "$api/api/weather?lat=$lat&lon=0" 502 'Failed to load weather data for this location.'
    }

    $timeouts = [ordered]@{}
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $reverseTimeout = Json "$api/api/weather?lat=2&lon=0"
    $watch.Stop()
    $timeouts.reverseMs = $watch.ElapsedMilliseconds
    Assert-That ($null -eq $reverseTimeout.location.name -and $watch.ElapsedMilliseconds -ge 2200 -and
        $watch.ElapsedMilliseconds -lt 4000) 'Reverse deadline was not 2.5s with successful forecast degradation.'
    $watch.Restart()
    Error-Envelope "$api/api/weather?lat=6&lon=0" 502 'Failed to load weather data for this location.'
    $watch.Stop()
    $timeouts.forecastMs = $watch.ElapsedMilliseconds
    Assert-That ($watch.ElapsedMilliseconds -ge 7600 -and $watch.ElapsedMilliseconds -lt 10000) 'Forecast deadline was not 8s.'
    $watch.Restart()
    $parallel = Json "$api/api/weather?lat=13&lon=0"
    $watch.Stop()
    $timeouts.parallelMs = $watch.ElapsedMilliseconds
    Assert-That ($watch.ElapsedMilliseconds -ge 350 -and $watch.ElapsedMilliseconds -lt 750 -and
        $parallel.location.name -ceq 'Fixture City') 'Native forecast and reverse lookups did not execute in parallel.'

    $places = Json "$api/api/geocode?q=%EF%BB%BF%20Fixture%C2%A0"
    Assert-That ($places.results.Count -eq 2 -and $null -eq $places.results[1].region -and
        $null -eq $places.results[1].country) 'Geocode results/null metadata differ.'
    foreach ($query in '', 'q=a', 'q=%20', 'q=Fixture&q=Other', 'Q=Fixture', 'q%5B%5D=Fixture') {
        Error-Envelope "$api/api/geocode?$query" 400 "Query param 'q' (min 2 characters) is required."
    }
    Assert-That ((Json "$api/api/geocode?q=Missing").results.Count -eq 0) 'Absent geocoding results did not become an empty array.'
    Assert-That ((Json "$api/api/geocode?q=Shape").results.Count -eq 6) 'The sample maps provider results without an extra truncation step.'
    foreach ($query in 'BadStatus', 'BadJson') {
        Error-Envelope "$api/api/geocode?q=$query" 502 'Failed to search for that place.'
    }
    $watch.Restart()
    Error-Envelope "$api/api/geocode?q=Timeout" 502 'Failed to search for that place.'
    $watch.Stop()
    $timeouts.searchMs = $watch.ElapsedMilliseconds
    Assert-That ($watch.ElapsedMilliseconds -ge 5600 -and $watch.ElapsedMilliseconds -lt 8000) 'Search deadline was not 6s.'
    $stats = Json "$fixture/__fixture/stats"
    foreach ($key in 'forecast:4', 'forecast:5', 'forecast:6', 'reverse:2', 'search:BadStatus', 'search:BadJson', 'search:Timeout') {
        Assert-That ($stats.calls.$key -eq 1) "Inherited retry/resilience changed the provider budget: $key."
    }
    Assert-That ($stats.calls.Fixture -eq $null -and $stats.calls.'search:Fixture' -eq 1) 'Search query was not trimmed like JavaScript.'

    $openapi = Json "$api/openapi.json"
    Assert-That ($openapi.openapi -match '^3\.1\.[0-9]+$' -and $openapi.info.title -ceq 'Aspire Weather Explorer API') 'Native OpenAPI 3.1 document generation failed.'
    foreach ($route in '/api/weather', '/api/geocode') {
        foreach ($status in '200', '400', '502') {
            Assert-That ($null -ne $openapi.paths.$route.get.responses.$status) "Missing OpenAPI response $status for $route."
        }
    }
    Assert-That ($openapi.paths.'/api/weather'.get.operationId -ceq 'getWeather' -and
        $openapi.paths.'/api/geocode'.get.operationId -ceq 'geocode') 'OpenAPI operation IDs changed.'
    $parameters = $openapi.paths.'/api/weather'.get.parameters
    Assert-That ($parameters[0].required -and $parameters[0].schema.type -ceq 'number' -and
        $parameters[0].schema.minimum -eq -90 -and $parameters[1].schema.maximum -eq 180) 'OpenAPI coordinate metadata is incorrect.'
    $schema200 = $openapi.paths.'/api/weather'.get.responses.'200'.content.'application/json'.schema
    Assert-That ($schema200.'$ref' -like '*WeatherResponse') 'Native OpenAPI 200 schema is not the weather response.'
    Assert-That ($null -ne $openapi.components.schemas.WeatherLocation.properties.name -and
        $null -ne $openapi.components.schemas.CurrentWeather.properties.time) 'Native response schemas were trimmed away.'
    $reference = Request "$api/reference"
    Assert-That ($reference.Content -match 'Aspire Weather Explorer API' -and
        $reference.Content -match 'openapi\.json' -and $reference.Content -match 'scalar\.js') 'Native Scalar HTML does not reference the generated document.'
    foreach ($url in $api, $frontend) {
        $index = Request "$url/"
        Assert-That ($index.Content -match 'id="root"' -and $index.Content -match 'type="module"') 'React HTML is unavailable.'
        Request "$url/Aspire.png" | Out-Null
        Request "$url/github.svg" | Out-Null
        Json "$url/api/weather?lat=47.6&lon=-122.3" | Out-Null
    }

    if (!$SkipBrowser) {
        Push-Location (Join-Path $demo 'verification')
        try {
            if (!(Test-Path 'node_modules\playwright')) {
                & npm ci --no-audit --no-fund --registry=https://registry.npmjs.org
                if ($LASTEXITCODE -ne 0) { throw 'Public browser verifier dependency restore failed.' }
            }
            $previousBrowsers = $env:PLAYWRIGHT_BROWSERS_PATH
            $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $demo '.artifacts\browsers'
            try {
                $edge = if ($IsWindows) { Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe' } else { '' }
                if (!$edge -or !(Test-Path $edge)) {
                    & npx --no-install playwright install chromium
                    if ($LASTEXITCODE -ne 0) { throw 'Local Chromium installation failed. No system toolchain was changed.' }
                }
                & node browser.mjs --api $api --frontend $frontend
                if ($LASTEXITCODE -ne 0) { throw 'Native/Vite/Scalar browser verification failed.' }
            } finally {
                $env:PLAYWRIGHT_BROWSERS_PATH = $previousBrowsers
            }
        } finally {
            Pop-Location
        }
    }

    $reverseLogs = @(Invoke-AspireJson @('otel', 'logs', 'api', '--apphost', $apphost,
        '--format', 'Json', '--search', 'Reverse geocoding failed', '--limit', '20'))
    $successLogs = @(Invoke-AspireJson @('otel', 'logs', 'api', '--apphost', $apphost,
        '--format', 'Json', '--search', 'Loaded weather forecast', '--limit', '20'))
    $traces = @(Invoke-AspireJson @('otel', 'traces', 'api', '--apphost', $apphost,
        '--format', 'Json', '--search', '/api/weather', '--limit', '20'))
    $forecastSpans = @(Invoke-AspireJson @('otel', 'spans', 'api', '--apphost', $apphost,
        '--format', 'Json', '--search', 'weather.forecast', '--limit', '20'))
    $clientSpans = @(Invoke-AspireJson @('otel', 'spans', 'api', '--apphost', $apphost,
        '--format', 'Json', '--search', '/v1/forecast', '--limit', '20'))
    Assert-That ($reverseLogs.Count -gt 0 -and $successLogs.Count -gt 0 -and
        @($reverseLogs | Where-Object { $_.traceId }).Count -gt 0) 'Actual native structured logs, including correlated reverse failure, did not reach Aspire.'
    Assert-That ($traces.Count -gt 0 -and
        @($forecastSpans | Where-Object { $_.name -ceq 'weather.forecast' }).Count -gt 0 -and
        @($clientSpans | Where-Object { $_.kind -ceq 'Client' }).Count -gt 0) 'Actual native server/provider trace spans did not reach Aspire.'
    $stats = Json "$fixture/__fixture/stats"
    Assert-That ($stats.telemetry.metricBatches -gt 0 -and $stats.telemetry.traceBatches -gt 0 -and
        $stats.telemetry.logBatches -gt 0 -and $stats.telemetry.weatherRequestPoints -gt 0 -and
        $stats.telemetry.weatherRequestTotal -gt 0 -and $stats.telemetry.weatherDurationCount -gt 0) 'Native OTLP trace/log/metric payloads were not accepted by Aspire.'
    $console = @(& $cli logs api --apphost $apphost --non-interactive --nologo) -join "`n"
    Assert-That ($LASTEXITCODE -eq 0 -and $console -match 'NativeAOT: True' -and
        $console -match 'JSON reflection enabled: False') 'The running executable did not identify native, reflection-free execution.'

    $summary = [ordered]@{
        runtimeIdentifier = $RuntimeIdentifier
        nativeExecutable = Join-Path $artifacts "Weather.Api$extension"
        checks = $script:checks
        endpoints = @{ api = $api; frontend = $frontend; providerFixture = $fixture }
        budgets = $timeouts
        openApi = $openapi.openapi
        scalar = $true
        browserVerified = !$SkipBrowser
        telemetry = $stats.telemetry
        traceCount = $traces.Count
        providerClientSpanCount = $clientSpans.Count
        correlatedReverseLogCount = $reverseLogs.Count
        aspireCli = '13.6.1'
    }
    $summary | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $verification "$RuntimeIdentifier-summary.json")
    Write-Host "PASS: $($script:checks) native assertions; OpenAPI, Scalar, React/Vite, provider parity and OTLP traces/logs/metrics verified."
} finally {
    if ($started) {
        & $cli stop --apphost $apphost --non-interactive --nologo
        if ($LASTEXITCODE -ne 0) { throw 'Failed to stop this verification-owned AppHost; inspect the exact target before publishing again.' }
    }
}
