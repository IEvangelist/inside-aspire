#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$AspirePath = '',
    [switch]$SkipGitHub,
    [string]$OutputDirectory = '.artifacts\rehearsal\docs-loop-tests'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$liveArguments = @()
if ($AspirePath) { $liveArguments += @('-AspirePath', $AspirePath) }
if ($SkipGitHub) { $liveArguments += '-SkipGitHub' }
$testOutput = $OutputDirectory
$show = Join-Path $PSScriptRoot 'Show-DocsLoop.ps1'
. $show
$directory = New-DocsLoopOutputDirectory $testOutput
$fixtureDirectory = Join-Path $directory 'fixtures'
New-Item -ItemType Directory -Path $fixtureDirectory | Out-Null
$fixture = Join-Path $fixtureDirectory 'command.ps1'
$pwsh = (Get-Command pwsh -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$script:DocsLoopTestResults = [Collections.Generic.List[object]]::new()

function Test-DocsLoopCase {
    param([string]$Name, [scriptblock]$Action, [string]$ExpectedError = '')
    $failure = $null
    try { & $Action | Out-Null } catch { $failure = $_.Exception.Message }
    if ($ExpectedError) {
        if ($null -eq $failure -or $failure -notlike "*$ExpectedError*") {
            throw "Test '$Name' expected '$ExpectedError', got '$failure'."
        }
    } elseif ($null -ne $failure) {
        throw "Test '$Name' failed: $failure"
    }
    $script:DocsLoopTestResults.Add([pscustomobject]@{ name = $Name; passed = $true })
}

function Invoke-DocsLoopFixture {
    param([string]$Scenario, [int]$TimeoutSeconds = 10)
    Invoke-DocsLoopCommand $pwsh @('-NoProfile', '-NonInteractive', '-File', $fixture, $Scenario) "fixture-$Scenario" $fixtureDirectory -TimeoutSeconds $TimeoutSeconds -Json
}

$fixtureText = @'
param([string]$Scenario)
switch ($Scenario) {
    'good' { '{"content":"fixture data"}' }
    'exit' { '{"content":"fixture data"}'; [Console]::Error.WriteLine('fixture error'); exit 7 }
    'empty' { }
    'whitespace' { '   ' }
    'invalid' { '{broken JSON' }
    'null' { 'null' }
    'array' { '[]' }
    'object' { '{}' }
    'scalar' { '"not a documentation object"' }
    'stderr-json' { [Console]::Error.WriteLine('{"content":"fixture data"}') }
    'version' { [Console]::Error.WriteLine('fixture version 1.0') }
    'date' { '{"mergedAt":"2026-09-04T15:00:36Z"}' }
    'wait' { Start-Sleep -Seconds 15; '{"content":"late fixture data"}' }
    default { exit 9 }
}
'@
Set-Content -LiteralPath $fixture -Value $fixtureText

try {
    Test-DocsLoopCase 'Successful child JSON is preserved' {
        $result = Invoke-DocsLoopFixture 'good'
        if ($result.data.content -cne 'fixture data' -or $result.exitCode -ne 0) { throw 'Child result changed.' }
    }
    Test-DocsLoopCase 'Nonzero exit fails even with valid JSON' { Invoke-DocsLoopFixture 'exit' } 'exited with code 7'
    Test-DocsLoopCase 'Empty stdout fails on exit zero' { Invoke-DocsLoopFixture 'empty' } 'empty stdout'
    Test-DocsLoopCase 'Whitespace stdout fails on exit zero' { Invoke-DocsLoopFixture 'whitespace' } 'empty stdout'
    Test-DocsLoopCase 'Malformed JSON fails on exit zero' { Invoke-DocsLoopFixture 'invalid' } 'invalid JSON'
    Test-DocsLoopCase 'JSON null fails on exit zero' { Invoke-DocsLoopFixture 'null' } 'empty JSON'
    Test-DocsLoopCase 'No-result array fails on exit zero' { Invoke-DocsLoopFixture 'array' } 'no results'
    Test-DocsLoopCase 'Empty object fails on exit zero' { Invoke-DocsLoopFixture 'object' } 'empty JSON'
    Test-DocsLoopCase 'Scalar JSON fails on exit zero' { Invoke-DocsLoopFixture 'scalar' } 'JSON scalar'
    Test-DocsLoopCase 'JSON on stderr cannot mask empty stdout' { Invoke-DocsLoopFixture 'stderr-json' } 'empty stdout'
    Test-DocsLoopCase 'Explicit stderr metadata is validated separately' {
        $result = Invoke-DocsLoopCommand $pwsh @('-NoProfile', '-NonInteractive', '-File', $fixture, 'version') 'fixture-version' $fixtureDirectory -StderrText
        if ($result.stderr.Trim() -cne 'fixture version 1.0') { throw 'Expected stderr metadata is missing.' }
    }
    Test-DocsLoopCase 'JSON timestamps remain strings across PowerShell versions' {
        $result = Invoke-DocsLoopFixture 'date'
        Assert-DocsLoopFields $result.data 'fixture' @('mergedAt')
    }
    Test-DocsLoopCase 'Child commands are bounded and stopped' { Invoke-DocsLoopFixture 'wait' 1 } 'timeout'

    $pages = @([pscustomobject]@{ title = 'aspire start command'; slug = 'fixture-derived-page' })
    $results = @([pscustomobject]@{ title = 'aspire start command'; slug = 'fixture-derived-page' })
    $document = [pscustomobject]@{
        title = 'aspire start command'
        slug = 'fixture-derived-page'
        content = $script:DocsLoopStartupProse
        sections = @('Overview', 'Startup timeout fixture section', 'Examples')
    }
    $sectionDocument = [pscustomobject]@{
        title = $document.title
        slug = $document.slug
        content = "### Startup timeout fixture section`n`n$($document.content)"
        sections = $document.sections
    }
    Test-DocsLoopCase 'Slug and section come from returned JSON' {
        $page = Select-DocsLoopPage $pages $results
        $section = Select-DocsLoopSection $document $page.slug
        Assert-DocsLoopSection $sectionDocument $page.slug $section
        if ($page.slug -cne 'fixture-derived-page' -or $section -cne 'Startup timeout fixture section') {
            throw 'Fixture identifiers were not derived.'
        }
    }
    Test-DocsLoopCase 'Search no-results cannot succeed' { Select-DocsLoopPage $pages @() } 'nonempty JSON array'
    Test-DocsLoopCase 'Search page must also exist in list' {
        Select-DocsLoopPage @([pscustomobject]@{ title = 'Other'; slug = 'other' }) $results
    } 'absent from docs list'
    Test-DocsLoopCase 'Ambiguous start results fail' { Select-DocsLoopPage $pages @($results[0], $results[0]) } 'unique aspire start'
    Test-DocsLoopCase 'Whitespace-only fields fail' {
        Assert-DocsLoopFields ([pscustomobject]@{ content = ' ' }) 'fixture' @('content')
    } 'empty'
    Test-DocsLoopCase 'Empty prose fails' { Assert-DocsLoopStartupProse '' 'fixture' } 'empty content'
    Test-DocsLoopCase 'Preparation prose drift fails' {
        Assert-DocsLoopStartupProse ($script:DocsLoopStartupProse.Replace('excludes', 'includes')) 'fixture'
    } 'prose drift'
    Test-DocsLoopCase 'Restore/build omission fails' {
        Assert-DocsLoopStartupProse ($script:DocsLoopStartupProse.Replace('including restore and build, ', '')) 'fixture'
    } 'prose drift'
    Test-DocsLoopCase 'Only whitespace normalization is permitted' {
        Assert-DocsLoopStartupProse ($script:DocsLoopStartupProse.Replace('including restore', "including`nrestore")) 'fixture'
    }
    Test-DocsLoopCase 'Wrong selected heading fails' {
        $wrong = [pscustomobject]@{
            title = $document.title; slug = $document.slug
            content = "### Another section`n$($document.content)"; sections = $document.sections
        }
        Assert-DocsLoopSection $wrong $document.slug 'Startup timeout fixture section'
    } 'selected heading'
    Test-DocsLoopCase 'Missing section names fail' {
        $missing = [pscustomobject]@{ title = $document.title; slug = $document.slug; content = $document.content; sections = @() }
        Select-DocsLoopSection $missing $document.slug
    } 'no section names'
    Test-DocsLoopCase 'Ambiguous timeout sections fail' {
        $ambiguous = [pscustomobject]@{
            title = $document.title; slug = $document.slug; content = $document.content
            sections = @('Startup timeout A', 'Startup timeout B')
        }
        Select-DocsLoopSection $ambiguous $document.slug
    } 'unique startup timeout'

    $apiResults = @([pscustomobject]@{
        id = 'csharp/fixture/methods#derived-vite'; name = 'AddViteApp(builder, name)'
        language = 'csharp'; kind = 'member'
    })
    $apiDocument = [pscustomobject]@{
        id = $apiResults[0].id; name = $apiResults[0].name; language = 'csharp'; kind = 'member'
        url = 'https://aspire.dev/reference/api/csharp/fixture/methods#derived-vite'
        content = '```csharp' + "`nIResourceBuilder<ViteAppResource> AddViteApp(builder, name);`n" + '```'
    }
    Test-DocsLoopCase 'API member ID is derived, not a hardcoded route' {
        $api = Select-DocsLoopApi $apiResults
        $code = Get-DocsLoopApiSnippet $apiDocument $api.id
        if ($api.id -cne 'csharp/fixture/methods#derived-vite' -or $code -notmatch 'AddViteApp') {
            throw 'Fixture API identity or code changed.'
        }
    }
    Test-DocsLoopCase 'API no-results cannot succeed' { Select-DocsLoopApi @() } 'nonempty JSON array'
    Test-DocsLoopCase 'Wrong API language fails' {
        Select-DocsLoopApi @([pscustomobject]@{ id = 'typescript/fixture'; name = 'AddViteApp()'; language = 'typescript'; kind = 'member' })
    } 'unique C# AddViteApp'
    Test-DocsLoopCase 'API get must preserve the requested ID' {
        Get-DocsLoopApiSnippet $apiDocument 'csharp/fixture/wrong'
    } 'different API identity'
    Test-DocsLoopCase 'Empty API contents fail' {
        $empty = $apiDocument.PSObject.Copy()
        $empty.content = ''
        Get-DocsLoopApiSnippet $empty $apiResults[0].id
    } "empty 'content'"
    Test-DocsLoopCase 'An unrelated C# block is not AddViteApp proof' {
        $unrelated = $apiDocument.PSObject.Copy()
        $unrelated.content = '```csharp' + "`nConsole.WriteLine();`n" + '```'
        Get-DocsLoopApiSnippet $unrelated $apiResults[0].id
    } 'no AddViteApp C# code/reference'
    $primaryOutcome = [pscustomobject]@{
        type = 'create_pull_request'; object_url = 'https://github.com/microsoft/aspire.dev/pull/1619'
        object_number = 1619; outcome_status = 'accepted'; evidence_strength = 'strong'; signal = 'merged'
        human_reviews = 3; attribution_status = 'unmapped'
    }
    $outcomes = [pscustomobject]@{
        run_id = 33887017276
        items = @($primaryOutcome, [pscustomobject]@{
            type = 'notify_source_pr'; outcome_status = 'pending'; evidence_strength = 'medium'; signal = 'pending'
            detail = 'no object reference to check'
        })
    }
    Test-DocsLoopCase 'Primary accepted outcome permits an unresolved notification' {
        $primary = Get-DocsLoopPrimaryOutcome $outcomes
        if ($primary.human_reviews -ne 3) { throw 'Primary human review evidence changed.' }
    }
    Test-DocsLoopCase 'Primary outcome must match the actual docs PR URL' {
        $wrong = $primaryOutcome.PSObject.Copy()
        $wrong.object_url = 'https://github.com/microsoft/aspire.dev/pull/999'
        Get-DocsLoopPrimaryOutcome ([pscustomobject]@{ run_id = 33887017276; items = @($wrong) })
    } 'no unique canonical'
    Test-DocsLoopCase 'A pending primary docs PR outcome fails' {
        $pending = $primaryOutcome.PSObject.Copy()
        $pending.outcome_status = 'pending'
        Get-DocsLoopPrimaryOutcome ([pscustomobject]@{ run_id = 33887017276; items = @($pending) })
    } 'not accepted/strong/merged'
    Test-DocsLoopCase 'Human review evidence is required' {
        $unreviewed = $primaryOutcome.PSObject.Copy()
        $unreviewed.human_reviews = 0
        Get-DocsLoopPrimaryOutcome ([pscustomobject]@{ run_id = 33887017276; items = @($unreviewed) })
    } 'human review'
    Test-DocsLoopCase 'Global CLI paths are rejected before execution' {
        Invoke-DocsLoopRehearsal -AspirePath $pwsh -SkipGitHub
    } 'global CLIs are not allowed'
    Test-DocsLoopCase 'Missing private CLI cannot fall back to global' {
        Invoke-DocsLoopRehearsal -AspirePath '.tools\missing-docs-loop-cli.exe' -SkipGitHub
    } 'no global fallback'
    Test-DocsLoopCase 'Tracked output paths are rejected' { New-DocsLoopOutputDirectory 'docs' } 'must stay under'

    $liveBase = Join-Path $directory 'live'
    $liveArguments += @('-OutputDirectory', $liveBase)
    $live = Invoke-DocsLoopCommand $pwsh (@('-NoProfile', '-NonInteractive', '-File', $show) + $liveArguments) 'live-rehearsal' $directory -TimeoutSeconds 300
    Write-Host $live.stdout.TrimEnd()
    $proofFiles = @(Get-ChildItem -LiteralPath $liveBase -Filter 'proof.json' -File -Recurse)
    if ($proofFiles.Count -ne 1) { throw 'The real rehearsal did not persist exactly one completed proof.' }
    $proof = Get-Content -LiteralPath $proofFiles[0].FullName -Raw | ConvertFrom-Json
    Test-DocsLoopCase 'Full real baseline persists validated docs and API proof' {
        if ($proof.cliVersion -cne '13.6.1' -or $proof.docs.listedPages -lt 1 -or
            $proof.docs.searchResults -lt 1 -or $proof.api.language -cne 'csharp' -or
            $proof.api.kind -cne 'member' -or $proof.docs.publishedPage.statusCode -ne 200 -or
            $proof.docs.corpus.statusCode -ne 200 -or $proof.github.checked -eq ($liveArguments -contains '-SkipGitHub')) {
            throw 'The live proof is incomplete or has the wrong GitHub validation mode.'
        }
        Assert-DocsLoopStartupProse $proof.docs.matchedProse 'Persisted live proof'
        if ($proof.api.codeExcerpt -notmatch '\bAddViteApp\s*\(') { throw 'No real AddViteApp code excerpt was saved.' }
    }
    $script:DocsLoopTestResults | ConvertTo-Json -Depth 10 |
        Set-Content -LiteralPath (Join-Path $directory 'test-results.json')
    Write-Host "PASS: $($script:DocsLoopTestResults.Count) checks, including the real public CLI rehearsal."
    Write-Host "Test evidence: $([IO.Path]::GetRelativePath($script:DocsLoopRoot, $directory))"
} finally {
    Remove-Item -LiteralPath $fixtureDirectory -Recurse -Force
}
