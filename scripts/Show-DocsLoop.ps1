#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$AspirePath = '',
    [switch]$SkipGitHub,
    [string]$OutputDirectory = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$script:DocsLoopRoot = Split-Path $PSScriptRoot -Parent
$script:DocsLoopStartupProse = '`ASPIRE_CLI_START_TIMEOUT` excludes AppHost preparation, including restore and build, guest dependency installation and pre-execution checks, and extension-owned builds.'
$script:DocsLoopJsonOptions = @{ Depth = 100; NoEnumerate = $true }
if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('DateKind')) {
    $script:DocsLoopJsonOptions.DateKind = 'String'
}

function Invoke-DocsLoopCommand {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$Name,
        [string]$CaptureDirectory = '',
        [AllowNull()][string]$InputText = $null,
        [ValidateRange(1, 300)][int]$TimeoutSeconds = 120,
        [switch]$StderrText,
        [switch]$Json
    )

    if ($StderrText -and $Json) { throw 'JSON commands must use stdout, not stderr metadata.' }
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $FilePath
    $start.WorkingDirectory = $script:DocsLoopRoot
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.RedirectStandardInput = $null -ne $InputText
    foreach ($argument in $Arguments) { $start.ArgumentList.Add($argument) }

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    try {
        if (-not $process.Start()) { throw "Command '$Name' could not start." }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if ($start.RedirectStandardInput) {
            $process.StandardInput.Write($InputText)
            $process.StandardInput.Close()
        }
        $timedOut = -not $process.WaitForExit($TimeoutSeconds * 1000)
        if ($timedOut) {
            $process.Kill($true)
            if (-not $process.WaitForExit(5000)) { throw "Command '$Name' could not be stopped after its timeout." }
        }
        $captureTasks = [Threading.Tasks.Task[]]@($stdoutTask, $stderrTask)
        if (-not [Threading.Tasks.Task]::WhenAll($captureTasks).Wait(5000)) {
            throw "Command '$Name' did not finish writing its captured output."
        }
        $result = [pscustomobject]@{
            name = $Name
            filePath = $FilePath
            arguments = $Arguments
            standardInput = $InputText
            exitCode = $process.ExitCode
            timedOut = $timedOut
            validationStream = if ($StderrText) { 'stderr' } else { 'stdout' }
            stdout = $stdoutTask.GetAwaiter().GetResult()
            stderr = $stderrTask.GetAwaiter().GetResult()
            data = $null
        }
    } finally {
        $process.Dispose()
    }

    if ($CaptureDirectory) {
        Set-Content -LiteralPath (Join-Path $CaptureDirectory "$Name.stdout.txt") -Value $result.stdout -NoNewline
        Set-Content -LiteralPath (Join-Path $CaptureDirectory "$Name.stderr.txt") -Value $result.stderr -NoNewline
        $result | Select-Object name, filePath, arguments, standardInput, exitCode, timedOut, validationStream |
            ConvertTo-Json -Depth 10 |
            Set-Content -LiteralPath (Join-Path $CaptureDirectory "$Name.command.json")
    }
    if ($result.timedOut) { throw "Command '$Name' exceeded its $TimeoutSeconds second timeout." }
    if ($result.exitCode -ne 0) { throw "Command '$Name' exited with code $($result.exitCode). Check its local stderr capture." }
    $text = if ($StderrText) { $result.stderr } else { $result.stdout }
    if ([string]::IsNullOrWhiteSpace($text)) { throw "Command '$Name' returned empty $($result.validationStream)." }
    if ($Json) {
        try {
            $result.data = ConvertFrom-Json -InputObject $result.stdout @script:DocsLoopJsonOptions
        } catch {
            throw "Command '$Name' returned invalid JSON."
        }
        $isObject = $null -ne $result.data -and $result.data.GetType().FullName -eq 'System.Management.Automation.PSCustomObject'
        if ($null -eq $result.data -or
            ($result.data -is [array] -and $result.data.Count -eq 0) -or
            ($isObject -and @($result.data.PSObject.Properties).Count -eq 0)) {
            throw "Command '$Name' returned empty JSON or no results."
        }
        if ($result.data -isnot [array] -and -not $isObject) {
            throw "Command '$Name' returned a JSON scalar instead of documentation or records."
        }
    }
    return $result
}

function Assert-DocsLoopFields {
    param([AllowNull()]$Value, [string]$Label, [string[]]$Fields)
    if ($null -eq $Value -or $Value.GetType().FullName -ne 'System.Management.Automation.PSCustomObject') {
        throw "$Label must be a JSON object."
    }
    foreach ($field in $Fields) {
        $property = $Value.PSObject.Properties[$field]
        if ($null -eq $property -or $property.Value -isnot [string] -or
            [string]::IsNullOrWhiteSpace($property.Value)) {
            throw "$Label has a missing or empty '$field' field."
        }
    }
}

function Assert-DocsLoopRows {
    param([AllowNull()]$Value, [string]$Label, [string[]]$Fields)
    if ($Value -isnot [array] -or $Value.Count -eq 0) {
        throw "$Label must be a nonempty JSON array."
    }
    foreach ($row in $Value) { Assert-DocsLoopFields $row $Label $Fields }
}

function Assert-DocsLoopStartupProse {
    param([AllowNull()][string]$Content, [string]$Label)
    if ([string]::IsNullOrWhiteSpace($Content)) { throw "$Label has empty content." }
    $normalized = $Content -replace '\s+', ' '
    if (-not $normalized.Contains($script:DocsLoopStartupProse)) {
        throw "$Label has prose drift: the exact AppHost preparation/restore/build exclusion is missing."
    }
}

function Select-DocsLoopPage {
    param($Pages, $Results)
    Assert-DocsLoopRows $Pages 'docs list' @('title', 'slug')
    Assert-DocsLoopRows $Results 'docs search' @('title', 'slug')
    $matches = @($Results | Where-Object { $_.title -match '^aspire start\b' })
    if ($matches.Count -ne 1) { throw 'docs search did not return a unique aspire start page.' }
    if ($Pages.slug -cnotcontains $matches[0].slug) { throw 'The search slug is absent from docs list.' }
    return $matches[0]
}

function Select-DocsLoopSection {
    param($Document, [string]$Slug)
    Assert-DocsLoopFields $Document 'docs get' @('title', 'slug', 'content')
    if ($Document.slug -cne $Slug) { throw 'docs get returned the wrong slug.' }
    Assert-DocsLoopStartupProse $Document.content 'docs get'
    $property = $Document.PSObject.Properties['sections']
    if ($null -eq $property -or $property.Value -isnot [array] -or $property.Value.Count -eq 0) {
        throw 'docs get returned no section names.'
    }
    foreach ($section in $Document.sections) {
        if ($section -isnot [string] -or [string]::IsNullOrWhiteSpace($section)) {
            throw 'docs get returned an empty section name.'
        }
    }
    $matches = @($Document.sections | Where-Object { $_ -match '\bstartup\b' -and $_ -match '\btimeout\b' })
    if ($matches.Count -ne 1) { throw 'docs get did not return a unique startup timeout section.' }
    return $matches[0]
}

function Assert-DocsLoopSection {
    param($Document, [string]$Slug, [string]$Section)
    Assert-DocsLoopFields $Document 'docs get --section' @('title', 'slug', 'content')
    if ($Document.slug -cne $Slug) { throw 'docs get --section returned the wrong slug.' }
    $heading = '(?m)^#{2,6}[ \t]+' + [regex]::Escape($Section) + '[ \t]*\r?$'
    if ($Document.content -notmatch $heading) { throw 'docs get --section did not return the selected heading.' }
    if ($Document.PSObject.Properties.Name -notcontains 'sections' -or
        $Document.sections -isnot [array] -or $Document.sections -cnotcontains $Section) {
        throw 'docs get --section returned no matching section metadata.'
    }
    Assert-DocsLoopStartupProse $Document.content 'docs get --section'
}

function Select-DocsLoopApi {
    param($Results)
    Assert-DocsLoopRows $Results 'docs api search' @('id', 'name', 'language', 'kind')
    $matches = @($Results | Where-Object {
        $_.language -ceq 'csharp' -and $_.kind -ceq 'member' -and $_.name -match '^AddViteApp\('
    })
    if ($matches.Count -ne 1) { throw 'docs api search did not return a unique C# AddViteApp member.' }
    return $matches[0]
}

function Get-DocsLoopApiSnippet {
    param($Document, [string]$Id)
    Assert-DocsLoopFields $Document 'docs api get' @('id', 'name', 'language', 'kind', 'url', 'content')
    if ($Document.id -cne $Id -or $Document.language -cne 'csharp' -or
        $Document.kind -cne 'member' -or $Document.name -notmatch '^AddViteApp\(' -or
        $Document.url -notmatch '^https://aspire\.dev/reference/api/csharp/') {
        throw 'docs api get returned a different API identity, language, kind or reference URL.'
    }
    # This selects a display excerpt from CLI content, not a replacement corpus parser.
    $blocks = [regex]::Matches($Document.content, '(?s)```csharp[ \t]*\r?\n(.*?)```')
    $matches = @($blocks | Where-Object {
        $_.Groups[1].Value -match '\bAddViteApp\s*\(' -and $_.Groups[1].Value -match '\bViteAppResource\b'
    })
    if ($matches.Count -eq 0) { throw 'docs api get contains no AddViteApp C# code/reference.' }
    return $matches[0].Groups[1].Value.Trim()
}

function New-DocsLoopOutputDirectory {
    param([string]$BaseDirectory)
    $allowed = [IO.Path]::GetFullPath((Join-Path $script:DocsLoopRoot '.artifacts\rehearsal'))
    $base = if ([IO.Path]::IsPathRooted($BaseDirectory)) {
        [IO.Path]::GetFullPath($BaseDirectory)
    } else {
        [IO.Path]::GetFullPath((Join-Path $script:DocsLoopRoot $BaseDirectory))
    }
    $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
    $prefix = $allowed.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $base.Equals($allowed, $comparison) -and -not $base.StartsWith($prefix, $comparison)) {
        throw 'OutputDirectory must stay under the repository .artifacts\rehearsal directory.'
    }
    $git = (Get-Command git -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $null = Invoke-DocsLoopCommand -FilePath $git -Arguments @('-C', $script:DocsLoopRoot, 'check-ignore', '--', (Join-Path $base 'guard.json')) -Name 'check-ignore'
    $directory = Join-Path $base ('run-{0}-{1}' -f [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'), [Guid]::NewGuid().ToString('N').Substring(0, 8))
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    return $directory
}

function Get-DocsLoopPublicDocument {
    param([string]$Url, [string]$Name, [string]$CaptureDirectory)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 90
    } catch {
        throw "Live HTTP read failed for $Url. Cached CLI results alone are not live proof."
    }
    if ($response.StatusCode -ne 200 -or [string]::IsNullOrWhiteSpace($response.Content)) {
        throw "Live HTTP read returned an unsuccessful or empty response for $Url."
    }
    Set-Content -LiteralPath (Join-Path $CaptureDirectory $Name) -Value $response.Content -NoNewline
    Assert-DocsLoopStartupProse $response.Content $Url
    return [pscustomobject]@{
        url = $Url
        statusCode = [int]$response.StatusCode
        contentLength = $response.Content.Length
    }
}

function Assert-DocsLoopHistory {
    param($Product, $Run, $Docs, $AwRun)
    Assert-DocsLoopFields $Product 'Product PR' @('title', 'url', 'state', 'mergedAt')
    Assert-DocsLoopFields $Docs 'Docs PR' @('title', 'url', 'state', 'mergedAt', 'body')
    Assert-DocsLoopFields $Docs.mergeCommit 'Docs PR merge' @('oid')
    Assert-DocsLoopFields $Run 'Workflow run' @('workflowName', 'url', 'status', 'conclusion')
    Assert-DocsLoopFields $AwRun 'gh aw logs run' @('url', 'workflow_path', 'status', 'conclusion')
    if ($Product.number -ne 19478 -or $Product.state -cne 'MERGED' -or
        $Product.url -cne 'https://github.com/microsoft/aspire/pull/19478') {
        throw 'The canonical product PR is not the expected merged PR.'
    }
    if ($Run.databaseId -ne 33887017276 -or $Run.status -cne 'completed' -or
        $Run.conclusion -cne 'success' -or $Run.workflowName -cne 'PR Documentation Check' -or
        $Run.url -cne 'https://github.com/microsoft/aspire/actions/runs/33887017276') {
        throw 'The canonical pr-docs-check run is not completed/successful.'
    }
    if ($Docs.number -ne 1619 -or $Docs.state -cne 'MERGED' -or
        $Docs.url -cne 'https://github.com/microsoft/aspire.dev/pull/1619' -or
        $Docs.mergeCommit.oid -cne '7d461ec15f2eb79a601d4fc8c63f5a61a6e2cc76' -or
        -not $Docs.body.Contains('microsoft/aspire#19478') -or -not $Docs.body.Contains($Run.url)) {
        throw 'The canonical docs PR is not the expected merged, source-linked draft outcome.'
    }
    if ($AwRun.run_id -ne $Run.databaseId -or $AwRun.status -cne 'completed' -or
        $AwRun.conclusion -cne 'success' -or $AwRun.url -cne $Run.url -or
        $AwRun.workflow_path -cne '.github/workflows/pr-docs-check.lock.yml') {
        throw 'gh aw logs returned a different or unsuccessful workflow run.'
    }
}

function Get-DocsLoopPrimaryOutcome {
    param($Outcomes)
    if ($Outcomes.PSObject.Properties.Name -notcontains 'run_id' -or $Outcomes.run_id -ne 33887017276 -or
        $Outcomes.PSObject.Properties.Name -notcontains 'items') {
        throw 'gh aw outcomes returned a different run or no safe-output items.'
    }
    Assert-DocsLoopRows $Outcomes.items 'gh aw outcomes items' @('type', 'outcome_status', 'evidence_strength', 'signal')
    $matches = @($Outcomes.items | Where-Object {
        $_.type -ceq 'create_pull_request' -and $_.PSObject.Properties.Name -contains 'object_url' -and
        $_.object_url -ceq 'https://github.com/microsoft/aspire.dev/pull/1619'
    })
    if ($matches.Count -ne 1) { throw 'gh aw outcomes returned no unique canonical docs PR outcome.' }
    $primary = $matches[0]
    if ($primary.outcome_status -cne 'accepted' -or $primary.evidence_strength -cne 'strong' -or
        $primary.signal -cne 'merged' -or $primary.object_number -ne 1619 -or $primary.human_reviews -lt 1) {
        throw 'The primary docs PR outcome is not accepted/strong/merged with human review.'
    }
    return $primary
}

function Invoke-DocsLoopRehearsal {
    param([string]$AspirePath = '', [switch]$SkipGitHub, [string]$OutputDirectory = '')
    if (-not $AspirePath) {
        $binary = if ($IsWindows) { 'aspire.exe' } else { 'aspire' }
        $AspirePath = Join-Path $script:DocsLoopRoot ".tools\aspire\$binary"
    }
    $cli = if ([IO.Path]::IsPathRooted($AspirePath)) {
        [IO.Path]::GetFullPath($AspirePath)
    } else {
        [IO.Path]::GetFullPath((Join-Path $script:DocsLoopRoot $AspirePath))
    }
    $rootPrefix = [IO.Path]::GetFullPath($script:DocsLoopRoot).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
    if (-not $cli.StartsWith($rootPrefix, $comparison)) {
        throw 'AspirePath must be an explicit repository-local public CLI path; global CLIs are not allowed.'
    }
    if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) {
        throw 'Repository-local public Aspire CLI is missing. Use scripts\Install-Aspire.ps1; there is no global fallback.'
    }
    if (-not $OutputDirectory) { $OutputDirectory = '.artifacts\rehearsal\docs-loop' }
    $capture = New-DocsLoopOutputDirectory $OutputDirectory
    $version = Invoke-DocsLoopCommand $cli @('--version', '--non-interactive', '--nologo') 'aspire-version' $capture
    if ($version.stdout.Trim() -notmatch '^13\.6\.1(?:\+[0-9a-f]+)?$') {
        throw 'This rehearsal requires the public Aspire CLI 13.6.1. Unexpected version text is retained only locally.'
    }
    Write-Host 'Read-only docs loop | repository-local public Aspire CLI 13.6.1'
    Write-Host "Local captures: $([IO.Path]::GetRelativePath($script:DocsLoopRoot, $capture))"

    $history = [ordered]@{ checked = $false; reason = 'SkipGitHub' }
    if (-not $SkipGitHub) {
        $gh = (Get-Command gh -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
        $awVersion = Invoke-DocsLoopCommand $gh @('aw', 'version') 'gh-aw-version' $capture -StderrText
        if ($awVersion.stderr.Trim() -notmatch '^gh aw version v0\.85\.4$') {
            throw 'This rehearsal requires gh-aw 0.85.4 for the verified read-only JSON contracts.'
        }
        $product = (Invoke-DocsLoopCommand $gh @('pr', 'view', '19478', '--repo', 'microsoft/aspire', '--json', 'number,title,url,state,mergedAt') 'product-pr' $capture -Json).data
        $run = (Invoke-DocsLoopCommand $gh @('run', 'view', '33887017276', '--repo', 'microsoft/aspire', '--json', 'databaseId,workflowName,status,conclusion,url') 'workflow-run' $capture -Json).data
        $docs = (Invoke-DocsLoopCommand $gh @('pr', 'view', '1619', '--repo', 'microsoft/aspire.dev', '--json', 'number,title,url,state,mergedAt,mergeCommit,body') 'docs-pr' $capture -Json).data
        $status = (Invoke-DocsLoopCommand $gh @('aw', 'status', 'pr-docs-check', '--repo', 'microsoft/aspire', '--json') 'gh-aw-status' $capture -Json).data
        Assert-DocsLoopRows $status 'gh aw status' @('workflow', 'status')
        $workflow = @($status | Where-Object { $_.workflow -ceq 'pr-docs-check' })
        if ($workflow.Count -ne 1) { throw 'gh aw status returned no unique pr-docs-check workflow.' }
        $logs = (Invoke-DocsLoopCommand $gh @('aw', 'logs', '--repo', 'microsoft/aspire', '--stdin', '--count', '1', '--artifacts', 'usage', '--json', '--timeout', '2', '--output', (Join-Path $capture 'gh-aw')) 'gh-aw-logs' $capture -InputText "33887017276`n" -TimeoutSeconds 180 -Json).data
        if ($logs.PSObject.Properties.Name -notcontains 'runs' -or $logs.runs -isnot [array] -or $logs.runs.Count -ne 1) {
            throw 'gh aw logs returned no unique canonical run; no latest-run fallback is allowed.'
        }
        Assert-DocsLoopHistory $product $run $docs $logs.runs[0]
        $usagePath = Join-Path $capture 'gh-aw\run-33887017276\agent_usage.json'
        if (-not (Test-Path -LiteralPath $usagePath -PathType Leaf)) {
            throw 'The exact-run usage artifact was not downloaded. Expired/missing artifacts are not log proof.'
        }
        $usageText = Get-Content -LiteralPath $usagePath -Raw
        if ([string]::IsNullOrWhiteSpace($usageText)) { throw 'The downloaded usage artifact is empty.' }
        try {
            $usage = ConvertFrom-Json -InputObject $usageText @script:DocsLoopJsonOptions
        } catch {
            throw 'The downloaded usage artifact contains invalid JSON.'
        }
        $isUsageObject = $null -ne $usage -and $usage.GetType().FullName -eq 'System.Management.Automation.PSCustomObject'
        if ($null -eq $usage -or ($usage -is [array] -and $usage.Count -eq 0) -or
            ($isUsageObject -and @($usage.PSObject.Properties).Count -eq 0) -or
            ($usage -isnot [array] -and -not $isUsageObject)) {
            throw 'The downloaded usage artifact contains empty or scalar JSON.'
        }
        $outcomesDirectory = Join-Path $capture 'gh-aw-outcomes'
        $outcomes = (Invoke-DocsLoopCommand $gh @('aw', 'outcomes', '33887017276', '--repo', 'microsoft/aspire', '--json', '--output', $outcomesDirectory, '--outcomes-dir', (Join-Path $outcomesDirectory 'outcomes')) 'gh-aw-outcomes' $capture -Json).data
        $primary = Get-DocsLoopPrimaryOutcome $outcomes
        $history = [ordered]@{
            checked = $true
            ghAwVersion = '0.85.4'
            productPr = $product
            workflowRun = $run
            docsPr = $docs | Select-Object number, title, url, state, mergedAt, mergeCommit
            workflowStatus = $workflow[0].status
            workflowPath = $logs.runs[0].workflow_path
            usageArtifact = [IO.Path]::GetRelativePath($capture, $usagePath)
            primaryOutcome = $primary | Select-Object type, object_url, object_number, outcome_status, evidence_strength, signal, human_reviews, attribution_status, time_to_outcome_hours
            secondaryOutcomes = @($outcomes.items | Where-Object { $_.type -cne 'create_pull_request' } | Select-Object type, outcome_status, detail)
        }
        Write-Host "Product PR #$($product.number): $($product.state) -> pr-docs-check $($run.databaseId): $($run.conclusion) -> docs PR #$($docs.number): $($docs.state)"
        Write-Host $docs.url
        Write-Host "Primary docs PR safe output: $($primary.outcome_status)/$($primary.evidence_strength)/$($primary.signal), $($primary.human_reviews) human reviews. Other outputs are not asserted accepted."
    } else {
        Write-Host 'GitHub history SKIPPED. This run proves live docs retrieval only, not the full historical chain.'
    }

    $common = @('--format', 'Json', '--non-interactive', '--nologo')
    $pages = (Invoke-DocsLoopCommand $cli (@('docs', 'list') + $common) 'docs-list' $capture -Json).data
    $results = (Invoke-DocsLoopCommand $cli (@('docs', 'search', 'startup timeout') + $common) 'docs-search' $capture -Json).data
    $page = Select-DocsLoopPage $pages $results
    Write-Host "docs list: $($pages.Count) pages | docs search 'startup timeout': $($results.Count) results"
    Write-Host "Derived slug: $($page.slug)"
    $full = (Invoke-DocsLoopCommand $cli (@('docs', 'get', $page.slug) + $common) 'docs-get' $capture -Json).data
    $section = Select-DocsLoopSection $full $page.slug
    $selected = (Invoke-DocsLoopCommand $cli (@('docs', 'get', $page.slug, '--section', $section) + $common) 'docs-section' $capture -Json).data
    Assert-DocsLoopSection $selected $page.slug $section
    Write-Host "Derived section: $section"
    Write-Host "Section metadata still lists all $($selected.sections.Count) page sections; content is the selected section."
    Write-Host $selected.content

    $apiResults = (Invoke-DocsLoopCommand $cli (@('docs', 'api', 'search', 'AddViteApp', '--language', 'csharp') + $common) 'api-search' $capture -Json).data
    $api = Select-DocsLoopApi $apiResults
    $apiDoc = (Invoke-DocsLoopCommand $cli (@('docs', 'api', 'get', $api.id) + $common) 'api-get' $capture -Json).data
    $apiCode = Get-DocsLoopApiSnippet $apiDoc $api.id
    Write-Host "Separate C# API lookup: $($apiDoc.name)"
    Write-Host "Derived member ID: $($apiDoc.id)"
    Write-Host $apiDoc.url
    Write-Host $apiCode

    $publicPage = Get-DocsLoopPublicDocument 'https://aspire.dev/reference/cli/commands/aspire-start.md' 'aspire-start-current.md' $capture
    $corpus = Get-DocsLoopPublicDocument 'https://aspire.dev/llms-full.txt' 'llms-full.txt' $capture
    Write-Host 'Live published Markdown and llms-full.txt both contain the exact preparation/restore/build exclusion.'

    $codeDirectory = Join-Path $script:DocsLoopRoot 'docs\code'
    foreach ($file in @('DocsFetcher.cs', 'DocsIndexService.cs', 'LlmsTxtParser.cs', 'ApiDocsFetcher.cs', 'ApiDocsIndexService.cs', 'ASPIRE-LICENSE.txt')) {
        if (-not (Test-Path -LiteralPath (Join-Path $codeDirectory $file) -PathType Leaf)) {
            throw "The pinned public source excerpt/license is missing: docs\code\$file"
        }
    }
    Write-Host 'Pinned C# parser excerpt (MIT; all five service excerpts are in docs\code):'
    Get-Content -LiteralPath (Join-Path $codeDirectory 'LlmsTxtParser.cs') | ForEach-Object { Write-Host $_ }
    Write-Host 'Reviewed docs -> deployed corpus -> cached local lexical lookup. Not model training, vector search or automatic merge.'

    $proof = [ordered]@{
        schemaVersion = 1
        recordedAtUtc = [DateTime]::UtcNow.ToString('o')
        cliVersion = '13.6.1'
        github = $history
        docs = [ordered]@{
            query = 'startup timeout'
            listedPages = $pages.Count
            searchResults = $results.Count
            slug = $page.slug
            title = $full.title
            selectedSection = $section
            sections = $full.sections
            selectedContentLength = $selected.content.Length
            matchedProse = $script:DocsLoopStartupProse
            publishedPage = $publicPage
            corpus = $corpus
        }
        api = [ordered]@{
            query = 'AddViteApp'
            id = $apiDoc.id
            name = $apiDoc.name
            language = $apiDoc.language
            kind = $apiDoc.kind
            url = $apiDoc.url
            contentLength = $apiDoc.content.Length
            codeExcerpt = $apiCode
        }
        publicSources = [ordered]@{
            cliSourceCommit = '213aa53159663c6f3e4a29bf7df907179ae6e1c4'
            docsSourceCommit = '1a61517655b4fd7811ef63fb5913f6fb623d9d6a'
            docsMergeCommit = '7d461ec15f2eb79a601d4fc8c63f5a61a6e2cc76'
        }
    }
    $proofPath = Join-Path $capture 'proof.json'
    $proof | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $proofPath
    Write-Host "VERIFIED. Proof: $([IO.Path]::GetRelativePath($script:DocsLoopRoot, $proofPath))"
    return [pscustomobject]$proof
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-DocsLoopRehearsal @PSBoundParameters | Out-Null
}
